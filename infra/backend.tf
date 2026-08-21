# Remote state for platform infra (Phase C). Bucket is bootstrapped outside this
# stack — see docs/PHASE_C_CHECKLIST.md and infra/README.md.
#
# Development prefix. For production, use a separate backend config or:
#   terraform init -backend-config="prefix=platform/production" -reconfigure

terraform {
  backend "gcs" {
    bucket = "cloudshiftg-tf-state-project-7fe2c753-1df6-4821-bf9"
    prefix = "platform/development"
  }
}
