# CloudShift-G platform infrastructure (GKE Autopilot)
#
# This stack provisions shared platform resources. Application Terraform
# (lib/terraform/) remains separate and generates tenant migration HCL only.
#
# Usage:
#   cd infra
#   terraform init
#   terraform plan -var-file=environments/dev.tfvars
#   terraform apply -var-file=environments/dev.tfvars
#
# Full Phase A runbook: ../docs/PHASE_A_CHECKLIST.md

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "cluster_name" {
  type    = string
  default = "cloudshiftg-autopilot"
}

variable "environment" {
  type    = string
  default = "development"
}

variable "db_tier" {
  type    = string
  default = "db-custom-1-3840"
}

variable "artifact_registry_repo" {
  type    = string
  default = "cloudshiftg"
}

variable "github_repository" {
  type        = string
  description = "GitHub repo (owner/name) allowed to deploy via Workload Identity Federation"
  default     = "iamzaidakbar/cloudapp"
}

locals {
  labels = {
    app         = "cloudshiftg"
    environment = var.environment
    managed-by  = "terraform"
  }

  # Pods talk to Cloud SQL via the Auth Proxy on localhost (Phase A).
  database_url_proxy = "postgresql://cloudshiftg:${urlencode(random_password.migrate.result)}@127.0.0.1:5432/cloudshiftg?schema=public"
  app_database_url_proxy = "postgresql://cloudshiftg_app:${urlencode(random_password.app.result)}@127.0.0.1:5432/cloudshiftg?schema=public"

  # Phase D — staging DB on the same instance
  staging_database_url_proxy     = "postgresql://cloudshiftg:${urlencode(random_password.migrate.result)}@127.0.0.1:5432/cloudshiftg_staging?schema=public"
  staging_app_database_url_proxy = "postgresql://cloudshiftg_app:${urlencode(random_password.app.result)}@127.0.0.1:5432/cloudshiftg_staging?schema=public"
}

data "google_project" "project" {
  project_id = var.project_id
}

# --- Networking ---
resource "google_compute_network" "vpc" {
  name                    = "cloudshiftg-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "gke" {
  name          = "cloudshiftg-gke"
  ip_cidr_range = "10.10.0.0/20"
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/14"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.30.0.0/20"
  }
}

resource "google_compute_router" "router" {
  name    = "cloudshiftg-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "cloudshiftg-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# --- Artifact Registry ---
resource "google_artifact_registry_repository" "apps" {
  location      = var.region
  repository_id = var.artifact_registry_repo
  description   = "CloudShift-G container images"
  format        = "DOCKER"
  labels        = local.labels
}

# Autopilot nodes pull images as the default Compute Engine SA
resource "google_artifact_registry_repository_iam_member" "gke_nodes_reader" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.apps.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# --- GKE Autopilot ---
resource "google_container_cluster" "autopilot" {
  provider = google-beta

  name     = var.cluster_name
  location = var.region

  enable_autopilot = true
  network          = google_compute_network.vpc.name
  subnetwork       = google_compute_subnetwork.gke.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  deletion_protection = false
}

# --- Cloud SQL ---
resource "google_sql_database_instance" "postgres" {
  name             = "cloudshiftg-pg-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = 20
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
    backup_configuration {
      enabled = true
    }
    user_labels = local.labels
  }

  deletion_protection = var.environment == "production"
  depends_on          = [google_service_networking_connection.private_vpc]
}

resource "google_compute_global_address" "private_ip" {
  name          = "cloudshiftg-sql-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}

resource "google_sql_database" "app" {
  name     = "cloudshiftg"
  instance = google_sql_database_instance.postgres.name
}

# Phase D — staging database on the shared instance
resource "google_sql_database" "staging" {
  name     = "cloudshiftg_staging"
  instance = google_sql_database_instance.postgres.name
}

resource "random_password" "migrate" {
  length  = 32
  special = false
}

resource "random_password" "app" {
  length  = 32
  special = false
}

resource "random_password" "session" {
  length  = 48
  special = false
}

# Migrate / Prisma CLI role (owns schema objects)
resource "google_sql_user" "migrate" {
  name     = "cloudshiftg"
  instance = google_sql_database_instance.postgres.name
  password = random_password.migrate.result
}

# Runtime app role (RLS applies — not a Cloud SQL superuser)
resource "google_sql_user" "app" {
  name     = "cloudshiftg_app"
  instance = google_sql_database_instance.postgres.name
  password = random_password.app.result
}

# --- Pub/Sub ---
resource "google_pubsub_topic" "audit_jobs" {
  name   = "cloudshiftg-audit-jobs"
  labels = local.labels
}

resource "google_pubsub_topic" "comparison_jobs" {
  name   = "cloudshiftg-comparison-jobs"
  labels = local.labels
}

resource "google_pubsub_subscription" "audit_worker" {
  name                 = "cloudshiftg-audit-jobs-worker"
  topic                = google_pubsub_topic.audit_jobs.name
  ack_deadline_seconds = 120
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

resource "google_pubsub_subscription" "comparison_worker" {
  name                 = "cloudshiftg-comparison-jobs-worker"
  topic                = google_pubsub_topic.comparison_jobs.name
  ack_deadline_seconds = 120
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# --- Workload Identity GSA ---
resource "google_service_account" "web" {
  account_id   = "cloudshiftg-web"
  display_name = "CloudShift-G web"
}

resource "google_service_account" "worker" {
  account_id   = "cloudshiftg-worker"
  display_name = "CloudShift-G worker"
}

resource "google_service_account" "terraform_job" {
  account_id   = "cloudshiftg-tf-job"
  display_name = "CloudShift-G terraform jobs"
}

# External Secrets Operator — syncs Secret Manager into K8s Secrets (Phase B)
resource "google_service_account" "eso" {
  account_id   = "cloudshiftg-eso"
  display_name = "CloudShift-G External Secrets"
}

resource "google_project_iam_member" "worker_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "web_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "tf_job_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.terraform_job.email}"
}

resource "google_project_iam_member" "web_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "worker_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "tf_job_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.terraform_job.email}"
}

# Workload Identity: bind KSA → GSA (namespaces: development + staging + production)
resource "google_service_account_iam_member" "web_wi_dev" {
  service_account_id = google_service_account.web.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[development/cloudshiftg-web]"
}

resource "google_service_account_iam_member" "web_wi_staging" {
  service_account_id = google_service_account.web.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[staging/cloudshiftg-web]"
}

resource "google_service_account_iam_member" "web_wi_prod" {
  service_account_id = google_service_account.web.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[production/cloudshiftg-web]"
}

resource "google_service_account_iam_member" "worker_wi_dev" {
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[development/cloudshiftg-worker]"
}

resource "google_service_account_iam_member" "worker_wi_staging" {
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[staging/cloudshiftg-worker]"
}

resource "google_service_account_iam_member" "worker_wi_prod" {
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[production/cloudshiftg-worker]"
}

resource "google_service_account_iam_member" "tf_wi_dev" {
  service_account_id = google_service_account.terraform_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[development/cloudshiftg-terraform-job]"
}

resource "google_service_account_iam_member" "tf_wi_staging" {
  service_account_id = google_service_account.terraform_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[staging/cloudshiftg-terraform-job]"
}

resource "google_service_account_iam_member" "tf_wi_prod" {
  service_account_id = google_service_account.terraform_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[production/cloudshiftg-terraform-job]"
}

# ESO controller SA (helm) + app-namespace SA used by SecretStore
resource "google_service_account_iam_member" "eso_wi" {
  service_account_id = google_service_account.eso.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[external-secrets/external-secrets]"
}

resource "google_service_account_iam_member" "eso_wi_dev_store" {
  service_account_id = google_service_account.eso.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[development/cloudshiftg-eso-sa]"
}

resource "google_service_account_iam_member" "eso_wi_staging_store" {
  service_account_id = google_service_account.eso.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[staging/cloudshiftg-eso-sa]"
}

# --- Secret Manager (versions written by Terraform for Phase A bootstrap) ---
resource "google_secret_manager_secret" "session" {
  secret_id = "cloudshiftg-session-secret"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret" "app_db_url" {
  secret_id = "cloudshiftg-app-database-url"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret" "db_url" {
  secret_id = "cloudshiftg-database-url"
  replication {
    auto {}
  }
  labels = local.labels
}

# Phase B — AWS / billing shells (versions added out-of-band; never commit key material)
resource "google_secret_manager_secret" "aws_access_key_id" {
  secret_id = "cloudshiftg-aws-access-key-id"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret" "aws_secret_access_key" {
  secret_id = "cloudshiftg-aws-secret-access-key"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret" "aws_region" {
  secret_id = "cloudshiftg-aws-region"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret" "gcp_billing_api_key" {
  secret_id = "cloudshiftg-gcp-billing-api-key"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret_version" "session" {
  secret      = google_secret_manager_secret.session.id
  secret_data = random_password.session.result
}

resource "google_secret_manager_secret_version" "db_url" {
  secret      = google_secret_manager_secret.db_url.id
  secret_data = local.database_url_proxy
}

resource "google_secret_manager_secret_version" "app_db_url" {
  secret      = google_secret_manager_secret.app_db_url.id
  secret_data = local.app_database_url_proxy
}

resource "google_secret_manager_secret_version" "aws_region" {
  secret      = google_secret_manager_secret.aws_region.id
  secret_data = "us-east-1"
}

# Placeholder so ExternalSecret can sync before a real billing key is set.
# isGcpBillingConfigured() treats only non-empty real keys as configured —
# "unset" is ignored by operators (replace via gcloud secrets versions add).
resource "google_secret_manager_secret_version" "gcp_billing_placeholder" {
  secret      = google_secret_manager_secret.gcp_billing_api_key.id
  secret_data = "unset"
}

# Phase D — staging DB URL secrets (session + AWS reuse development SM IDs)
resource "google_secret_manager_secret" "staging_db_url" {
  secret_id = "cloudshiftg-staging-database-url"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret" "staging_app_db_url" {
  secret_id = "cloudshiftg-staging-app-database-url"
  replication {
    auto {}
  }
  labels = local.labels
}

resource "google_secret_manager_secret_version" "staging_db_url" {
  secret      = google_secret_manager_secret.staging_db_url.id
  secret_data = local.staging_database_url_proxy
}

resource "google_secret_manager_secret_version" "staging_app_db_url" {
  secret      = google_secret_manager_secret.staging_app_db_url.id
  secret_data = local.staging_app_database_url_proxy
}

locals {
  secret_accessor_members = {
    web    = "serviceAccount:${google_service_account.web.email}"
    worker = "serviceAccount:${google_service_account.worker.email}"
    eso    = "serviceAccount:${google_service_account.eso.email}"
  }

  all_app_secrets = {
    session               = google_secret_manager_secret.session.secret_id
    db_url                = google_secret_manager_secret.db_url.secret_id
    app_db_url            = google_secret_manager_secret.app_db_url.secret_id
    aws_access_key_id     = google_secret_manager_secret.aws_access_key_id.secret_id
    aws_secret_access_key = google_secret_manager_secret.aws_secret_access_key.secret_id
    aws_region            = google_secret_manager_secret.aws_region.secret_id
    gcp_billing_api_key   = google_secret_manager_secret.gcp_billing_api_key.secret_id
    staging_db_url        = google_secret_manager_secret.staging_db_url.secret_id
    staging_app_db_url    = google_secret_manager_secret.staging_app_db_url.secret_id
  }
}

resource "google_secret_manager_secret_iam_member" "accessors" {
  for_each = {
    for pair in flatten([
      for member_key, member in local.secret_accessor_members : [
        for secret_key, secret_id in local.all_app_secrets : {
          key       = "${member_key}-${secret_key}"
          secret_id = secret_id
          member    = member
        }
      ]
    ]) : pair.key => pair
  }

  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value.member
}

# --- Phase D: GitHub Actions deploy via Workload Identity Federation ---
resource "google_service_account" "github_deploy" {
  account_id   = "cloudshiftg-github-deploy"
  display_name = "CloudShift-G GitHub Actions deploy"
}

resource "google_project_iam_member" "github_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_deploy.email}"
}

resource "google_project_iam_member" "github_gke_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.github_deploy.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Phase D CI/CD for CloudShift-G"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "assertion.repository == '${var.github_repository}'"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_deploy_wif" {
  service_account_id = google_service_account.github_deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

output "cluster_name" {
  value = google_container_cluster.autopilot.name
}

output "cluster_location" {
  value = var.region
}

output "artifact_registry" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.apps.repository_id}"
}

output "sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "sql_private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
}

output "web_gsa_email" {
  value = google_service_account.web.email
}

output "worker_gsa_email" {
  value = google_service_account.worker.email
}

output "terraform_job_gsa_email" {
  value = google_service_account.terraform_job.email
}

output "eso_gsa_email" {
  value = google_service_account.eso.email
}

output "github_deploy_sa_email" {
  value = google_service_account.github_deploy.email
}

output "github_workload_identity_provider" {
  value = "projects/${data.google_project.project.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id}"
}

output "secret_ids" {
  value = {
    session_secret              = google_secret_manager_secret.session.secret_id
    database_url                = google_secret_manager_secret.db_url.secret_id
    app_database_url            = google_secret_manager_secret.app_db_url.secret_id
    staging_database_url        = google_secret_manager_secret.staging_db_url.secret_id
    staging_app_database_url    = google_secret_manager_secret.staging_app_db_url.secret_id
    aws_access_key_id           = google_secret_manager_secret.aws_access_key_id.secret_id
    aws_secret_access_key       = google_secret_manager_secret.aws_secret_access_key.secret_id
    aws_region                  = google_secret_manager_secret.aws_region.secret_id
    gcp_billing_api_key         = google_secret_manager_secret.gcp_billing_api_key.secret_id
  }
}
