# Platform Terraform for CloudShift-G (GKE Autopilot, VPC, Cloud SQL, Pub/Sub, WI).
# Not related to tenant migration HCL under lib/terraform/.

## Prerequisites
- `gcloud` authenticated with Owner/Editor on the target project
- APIs: container, sqladmin, artifactregistry, pubsub, secretmanager, servicenetworking, compute

```bash
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  servicenetworking.googleapis.com \
  compute.googleapis.com \
  iamcredentials.googleapis.com
```

## Apply

```bash
cd infra
terraform init
terraform plan  -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

After apply, create Secret Manager versions for `cloudshiftg-session-secret`,
`cloudshiftg-app-database-url`, and `cloudshiftg-database-url`, then deploy
the Helm chart under `deploy/helm/cloudshiftg`.
