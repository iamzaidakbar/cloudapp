# Platform Terraform for CloudShift-G (GKE Autopilot)

Not related to tenant migration HCL under `lib/terraform/`.

**Phase A runbook + completion checklist:** [docs/PHASE_A_CHECKLIST.md](../docs/PHASE_A_CHECKLIST.md)

## Prerequisites

- `gcloud` authenticated with Owner/Editor on the target project
- Billing enabled
- APIs:

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

Terraform creates SQL users, Secret Manager **versions** (proxy-form DB URLs + session secret), WI bindings, and AR reader for Autopilot nodes.

Then follow Phase A scripts (from repo root):

1. `scripts/phase-a-sync-k8s-secrets.sh` — copy SM → K8s Secret  
2. `scripts/phase-a-build-push.sh` — build/push images  
3. `scripts/phase-a-helm-upgrade.sh` — migrate Job + web/worker  

CSI sync (no manual K8s Secret) is Phase B.
