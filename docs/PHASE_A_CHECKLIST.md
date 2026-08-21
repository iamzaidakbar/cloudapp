# Phase A — Prove GKE Autopilot platform

Runbook + definition of done for the first live Autopilot deploy.
CSI, remote Terraform state, staging, and full CI are **out of scope** (Phases B–D).

**Region note:** Phase A defaults to `us-east1` (see `dev.tfvars`) to avoid common `us-central1` SSD quota limits on free/trial projects. If Autopilot fails with `GCE_QUOTA_EXCEEDED` / `SSD_TOTAL_GB`, change `region` or request a quota increase.

---

## Prerequisites

- [ ] Billing enabled on the GCP project
- [ ] `gcloud` authenticated (`gcloud auth login` + `gcloud auth application-default login`)
- [ ] `gcloud config set project <PROJECT_ID>` matches `infra/environments/dev.tfvars`
- [ ] Local tools: `terraform` (>= 1.5), `kubectl`, `helm`, Docker
- [ ] You accept Autopilot + Cloud SQL cost

Enable APIs:

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

- [ ] APIs enabled

---

## A2 — Platform Terraform

```bash
cd infra
terraform init
terraform plan  -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

Record outputs:

```bash
terraform output -raw cluster_name
terraform output -raw artifact_registry
terraform output -raw sql_connection_name
terraform output -raw web_gsa_email
terraform output -raw worker_gsa_email
terraform output -raw terraform_job_gsa_email
```

- [ ] `terraform apply` succeeded (Autopilot, VPC, AR, Cloud SQL, Pub/Sub, GSAs, WI, Secret versions)
- [ ] Outputs recorded

---

## A3 — Cluster access + K8s Secret

```bash
export PROJECT_ID="$(gcloud config get-value project)"
export REGION=us-east1

gcloud container clusters get-credentials "$(cd infra && terraform output -raw cluster_name)" \
  --region "$REGION" --project "$PROJECT_ID"

# Bash (Git Bash / WSL). On Windows PowerShell, copy the three secret values
# from Secret Manager into kubectl create secret manually.
export PROJECT_ID
bash scripts/phase-a-sync-k8s-secrets.sh
```

- [ ] `kubectl` talks to Autopilot cluster
- [ ] Namespace `development` exists
- [ ] Secret `cloudshiftg-secrets` has `SESSION_SECRET`, `DATABASE_URL`, `APP_DATABASE_URL`
- [ ] URLs use `127.0.0.1:5432` (Cloud SQL Auth Proxy form)

---

## A4 — Images

```bash
export PROJECT_ID
bash scripts/phase-a-build-push.sh
# note IMAGE_TAG and REGISTRY printed at the end
```

- [ ] `web`, `worker`, `terraform-job` pushed to Artifact Registry

---

## A5 — Helm (migrate hook + web + worker)

```bash
cd infra
export SQL_CONNECTION_NAME="$(terraform output -raw sql_connection_name)"
export WEB_GSA="$(terraform output -raw web_gsa_email)"
export WORKER_GSA="$(terraform output -raw worker_gsa_email)"
export TF_GSA="$(terraform output -raw terraform_job_gsa_email)"
cd ..

export IMAGE_TAG=...   # from build script
export REGISTRY=...    # from build script
bash scripts/phase-a-helm-upgrade.sh
```

- [ ] Helm release `cloudshiftg` installed in `development`
- [ ] Migrate Job completed (Prisma migrations + app grants)
- [ ] Web + worker Deployments Ready
- [ ] Cloud SQL Auth Proxy sidecars not CrashLooping

```bash
kubectl -n development get deploy,pods,svc,job
kubectl -n development logs -l app.kubernetes.io/component=web -c cloud-sql-proxy --tail=50
kubectl -n development logs -l app.kubernetes.io/component=worker --tail=50
```

---

## A6 — Smoke (exit criteria)

```bash
kubectl -n development port-forward svc/cloudshiftg-web 8080:80
```

In another terminal:

```bash
curl -fsS http://localhost:8080/api/health
curl -fsS http://localhost:8080/api/ready
```

Browser: open `http://localhost:8080` → login → **Audits** → **Run Audit**.

```bash
kubectl -n development logs -l app.kubernetes.io/component=worker -c worker --tail=100 -f
```

### Smoke checklist

- [ ] `/api/health` OK via port-forward
- [ ] `/api/ready` OK via port-forward (DB reachable through proxy)
- [ ] Login works in browser via port-forward
- [ ] One audit Queued → Running → Succeeded
- [ ] Worker logs show `[worker] start AUDIT` / `done AUDIT`
- [ ] (Optional) Comparison succeeds

---

## Definition of done (Phase A)

**Prereqs**
- [ ] Billing + APIs enabled
- [ ] `gcloud` on correct project
- [ ] `dev.tfvars` project_id matches applied project

**Infra**
- [ ] Terraform apply succeeded
- [ ] Outputs recorded

**Data plane**
- [ ] SQL users created (Terraform)
- [ ] `prisma migrate deploy` applied on Cloud SQL
- [ ] `cloudshiftg_app` grants applied
- [ ] K8s Secret `cloudshiftg-secrets` in `development`

**Workloads**
- [ ] Images pushed
- [ ] Helm installed; pods Ready
- [ ] Proxy sidecars healthy
- [ ] WI / Pub/Sub: no auth errors on worker when audit runs

**Smoke**
- [ ] health + ready + login + one successful audit via worker

## Live prove-out notes (2026-08-21)

Completed against project `project-7fe2c753-1df6-4821-bf9`:

- [x] APIs enabled
- [x] Terraform apply in **us-east1** (us-central1 hit `SSD_TOTAL_GB` quota)
- [x] K8s Secret synced; Cloud SQL Auth Proxy sidecars on web/worker
- [x] Images `*:phase-a` pushed to Artifact Registry
- [x] Prisma migrations + `cloudshiftg_app` grants applied
- [x] Helm release `cloudshiftg` **deployed** in `development`
- [x] `/api/health` and `/api/ready` OK via `kubectl port-forward svc/cloudshiftg-web 8080:80`
- [x] Worker logs: subscribed to `cloudshiftg-audit-jobs-worker` and `cloudshiftg-comparison-jobs-worker`

Still for you in the browser (port-forward on 8080):

- [ ] Open `http://localhost:8080` → register at `/onboarding` (or seed Platform Operator)
- [ ] Connect AWS (or Dev Adapter) → Run Audit → confirm worker log `start AUDIT` / `done AUDIT`

**Handoff:** Phase B = Secret Manager CSI / External Secrets + AWS on GKE — see [docs/PHASE_B_CHECKLIST.md](PHASE_B_CHECKLIST.md).

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Migrate Job can't connect | Secret URLs use `127.0.0.1`; proxy sidecar running; GSA has `roles/cloudsql.client` |
| ImagePullBackOff | AR reader on Compute SA; `gcloud auth configure-docker` |
| Worker never picks audit | Pub/Sub subscription names match `PUBSUB_TOPIC_PREFIX`; WI on worker GSA |
| `/api/ready` 503 | Proxy logs; `APP_DATABASE_URL` password; grants for `cloudshiftg_app` |
| Helm hangs on Ingress | `values-development.yaml` sets `ingress.enabled: false` for Phase A |
| Autopilot `SSD_TOTAL_GB` / `GCE_QUOTA_EXCEEDED` | Change `region` in `dev.tfvars` (e.g. `us-east1`) or request SSD quota increase in that region |
