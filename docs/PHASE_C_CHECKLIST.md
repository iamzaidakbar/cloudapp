# Phase C — Remote TF state + Job prove-out

Platform Terraform state in GCS, and terraform-family work runs as Kubernetes
Jobs with Cloud SQL Auth Proxy (same DB URL shape as web/worker).

**Project / region:** `infra/environments/dev.tfvars` (us-east1).

---

## Prerequisites

- [ ] Phase A + B complete (cluster, ESO, AWS env on pods)
- [ ] `gcloud`, `kubectl`, `helm`, Docker, Terraform CLI
- [ ] Local identity can create GCS buckets and push to Artifact Registry

---

## C1 — GCS remote state (platform infra)

Bucket (bootstrapped once, outside the Terraform stack that uses it):

```bash
PROJECT_ID=project-7fe2c753-1df6-4821-bf9
BUCKET=cloudshiftg-tf-state-${PROJECT_ID}
gcloud storage buckets create "gs://${BUCKET}" --project="${PROJECT_ID}" --location=us-east1 --uniform-bucket-level-access
gcloud storage buckets update "gs://${BUCKET}" --versioning
```

Config: [`infra/backend.tf`](../infra/backend.tf) → prefix `platform/development`.

Migrate from a machine that still has local `terraform.tfstate`:

```bash
cd infra
terraform init -migrate-state -force-copy
terraform plan -var-file=environments/dev.tfvars
```

Expect an empty (or no-op) plan after migrate.

- [ ] State bucket exists with versioning
- [ ] `backend "gcs"` configured
- [ ] Local state migrated; plan clean
- [ ] Operators have object R/W on the bucket (e.g. `roles/storage.objectAdmin` on bucket)

---

## C2 — Job Cloud SQL proxy

[`lib/jobs/k8s-job.ts`](../lib/jobs/k8s-job.ts) adds Cloud SQL Auth Proxy as a
**native sidecar** (`initContainers` + `restartPolicy: Always`) when
`CLOUDSQL_INSTANCE_CONNECTION_NAME` is set, so the Job completes when the main
container exits. Web Helm injects that env from `cloudsql.instanceConnectionName`.

Rebuild and deploy:

```bash
export PROJECT_ID=project-7fe2c753-1df6-4821-bf9
export REGION=us-east1
export TAG=phase-c
# scripts/phase-a-build-push.sh or equivalent docker build/push for web + terraform-job
helm upgrade --install cloudshiftg deploy/helm/cloudshiftg \
  --namespace development \
  -f deploy/helm/cloudshiftg/values-development.yaml \
  --set image.registry=${REGION}-docker.pkg.dev/${PROJECT_ID}/cloudshiftg \
  --set image.webTag=${TAG} \
  --set image.workerTag=${TAG} \
  --set image.terraformJobTag=${TAG} \
  --set env.GCP_PROJECT_ID=${PROJECT_ID} \
  --set cloudsql.instanceConnectionName=${PROJECT_ID}:${REGION}:cloudshiftg-pg-development \
  --set serviceAccount.web.gcpServiceAccount=cloudshiftg-web@${PROJECT_ID}.iam.gserviceaccount.com \
  --set serviceAccount.worker.gcpServiceAccount=cloudshiftg-worker@${PROJECT_ID}.iam.gserviceaccount.com \
  --set serviceAccount.terraformJob.gcpServiceAccount=cloudshiftg-tf-job@${PROJECT_ID}.iam.gserviceaccount.com \
  --wait --timeout 15m
```

- [ ] Web env includes `CLOUDSQL_INSTANCE_CONNECTION_NAME`
- [ ] `JOB_RUNTIME=k8s-job`
- [ ] terraform-job image tag pinned (`phase-c`)

---

## C3 — Live Job prove-out

1. Open the app (port-forward if needed): `kubectl -n development port-forward svc/cloudshiftg-web 8081:80`
2. Create or open a migration plan → **Generate Terraform**
3. Confirm a Job appears and Succeeds:

```bash
kubectl -n development get jobs -l app=cloudshiftg --sort-by=.metadata.creationTimestamp
kubectl -n development logs job/<name> -c terraform-job
```

4. **Apply** when the plan is ready (minimal/safe resources preferred). Confirm Job has the
   native proxy sidecar and `ApplyRun` reaches a terminal success/failure that is **not** a
   DB connection error.
5. **Rollback** if apply created real resources; otherwise note skip.

Optional DB/proxy smoke Job (no migration plan required):

```bash
kubectl apply -f deploy/phase-c-db-prove-job.yaml
kubectl -n development wait --for=condition=complete job/phase-c-db-prove --timeout=180s
```

- [ ] At least one TERRAFORM Job Succeeded with DB access
- [ ] At least one APPLY Job ran with proxy sidecar (success or non-DB failure)
- [ ] ROLLBACK proven or explicitly skipped

---

## Definition of done

**Remote state**
- [ ] Second session: `cd infra && terraform init && terraform plan -var-file=environments/dev.tfvars` without copying `tfstate`

**Jobs**
- [ ] Terraform-family Jobs reach Cloud SQL via proxy
- [ ] Generate (and apply/rollback as applicable) proven on Autopilot

**Handoff**
- [ ] Phase D next (staging namespace + fuller CI) — see [docs/PHASE_D_CHECKLIST.md](PHASE_D_CHECKLIST.md)

---

## Out of scope

- Tenant migration HCL GCS backends (Postgres `terraformState` remains source of truth)
- Narrowing `roles/editor` on tf-job GSA
- Staging / full CI pipeline
