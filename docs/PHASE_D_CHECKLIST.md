# Phase D — Staging namespace + fuller CI

Separate `staging` (and empty `production`) namespaces on the existing Autopilot
cluster, plus a working GKE deploy workflow (AR → Helm). Shared Cloud SQL with
database `cloudshiftg_staging`.

**Project / region:** `infra/environments/dev.tfvars` (`us-east1`).

---

## Prerequisites

- [ ] Phase A–C complete (cluster, ESO in development, remote TF state, Job proxy)
- [ ] `gcloud`, `kubectl`, `helm`, Terraform
- [ ] GitHub repo admin access to set Actions secrets (for live CI)

---

## D1 — Terraform (staging DB + WI + GitHub WIF)

```bash
cd infra
terraform apply -var-file=environments/dev.tfvars
terraform output github_deploy_sa_email
terraform output github_workload_identity_provider
terraform output sql_connection_name
```

- [ ] Database `cloudshiftg_staging` exists
- [ ] SM secrets `cloudshiftg-staging-database-url` / `cloudshiftg-staging-app-database-url`
- [ ] WI bindings for `staging/*` KSAs
- [ ] GSA `cloudshiftg-github-deploy` + WIF pool/provider for `iamzaidakbar/cloudapp`

---

## D2 — Namespaces + ESO staging

```bash
kubectl create namespace staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f deploy/external-secrets/staging/secretstore.yaml
kubectl apply -f deploy/external-secrets/staging/externalsecret-cloudshiftg.yaml

kubectl -n staging get secretstore,externalsecret
```

- [ ] Namespaces `development`, `staging`, `production` exist
- [ ] Staging SecretStore Ready; ExternalSecret SecretSynced

---

## D3 — Helm install staging

```bash
export PROJECT_ID=project-7fe2c753-1df6-4821-bf9
export REGION=us-east1
export TAG=phase-c   # or a git SHA after CI builds
export REGISTRY=${REGION}-docker.pkg.dev/${PROJECT_ID}/cloudshiftg

helm upgrade --install cloudshiftg deploy/helm/cloudshiftg \
  --namespace staging --create-namespace \
  -f deploy/helm/cloudshiftg/values-staging.yaml \
  --set image.registry=${REGISTRY} \
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

- [ ] Staging web/worker Ready (worker may stay at 0 replicas under Autopilot
      free/trial quota while development also runs; web smoke is enough for DoD)
- [ ] Migrate Job succeeded (`values-staging.yaml` had `migrate.enabled: true` on first install)

Smoke:

```bash
kubectl -n staging port-forward svc/cloudshiftg-web 8082:80
# GET http://127.0.0.1:8082/api/health and /api/ready
```

- [ ] health + ready OK on staging

After first successful migrate, set `migrate.enabled: false` in values-staging (or `--set migrate.enabled=false`) to avoid hook stalls on every upgrade.

---

## D4 — GitHub Actions (SKIPPED)

**Skipped** (GitHub account billing lock / not required for the primary GKE goal).

Deploy with Helm from a laptop instead:

```bash
# see D3 — Helm install staging / development
```

WIF + workflow files remain in the repo for later when Actions is usable.
Secrets table kept below for that day — do not block Phase E on CI.

<details><summary>GitHub secrets (when unblocking Actions later)</summary>

| Secret | Value |
|--------|--------|
| `GCP_PROJECT_ID` | `project-7fe2c753-1df6-4821-bf9` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/567673576340/locations/global/workloadIdentityPools/github-actions/providers/github` |
| `GCP_DEPLOY_SA` | `cloudshiftg-github-deploy@project-7fe2c753-1df6-4821-bf9.iam.gserviceaccount.com` |
| `GKE_CLUSTER_NAME` | `cloudshiftg-autopilot-dev` |
| `CLOUDSQL_INSTANCE_CONNECTION_NAME` | `project-7fe2c753-1df6-4821-bf9:us-east1:cloudshiftg-pg-development` |
| `WEB_GSA_EMAIL` | `cloudshiftg-web@project-7fe2c753-1df6-4821-bf9.iam.gserviceaccount.com` |
| `WORKER_GSA_EMAIL` | `cloudshiftg-worker@project-7fe2c753-1df6-4821-bf9.iam.gserviceaccount.com` |
| `TERRAFORM_JOB_GSA_EMAIL` | `cloudshiftg-tf-job@project-7fe2c753-1df6-4821-bf9.iam.gserviceaccount.com` |

</details>

---

## Definition of done

- [x] Three namespaces exist
- [x] Staging app healthy (web; worker may be 0 under quota)
- [x] CI workflow corrected in repo (Actions run **skipped**)
- [x] Helm deploy path proven without Actions

**Handoff:** Phase E next (logging / monitoring / alerts) — see [docs/PHASE_E_CHECKLIST.md](PHASE_E_CHECKLIST.md).

---

## Out of scope

- Live production Helm cutover / `prod.tfvars` apply
- Second cluster or Cloud SQL instance
- Cloud Run keep-alive path
