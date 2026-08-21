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

locals {
  labels = {
    app         = "cloudshiftg"
    environment = var.environment
    managed-by  = "terraform"
  }
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
  name  = "cloudshiftg-audit-jobs-worker"
  topic = google_pubsub_topic.audit_jobs.name
  ack_deadline_seconds = 120
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

resource "google_pubsub_subscription" "comparison_worker" {
  name  = "cloudshiftg-comparison-jobs-worker"
  topic = google_pubsub_topic.comparison_jobs.name
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

# Workload Identity: bind KSA → GSA (namespaces: development + production)
resource "google_service_account_iam_member" "web_wi_dev" {
  service_account_id = google_service_account.web.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[development/cloudshiftg-web]"
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

resource "google_service_account_iam_member" "tf_wi_prod" {
  service_account_id = google_service_account.terraform_job.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[production/cloudshiftg-terraform-job]"
}

# --- Secret Manager placeholders (values set outside Terraform) ---
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

output "cluster_name" {
  value = google_container_cluster.autopilot.name
}

output "artifact_registry" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.apps.repository_id}"
}

output "sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
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
