# Phase G — Helm rolling upgrade + rollback

Prove **deploy mechanics** on Autopilot namespace `development`: new image tag →
`helm upgrade` (RollingUpdate) → smoke → `helm rollback` → smoke. **No GitHub Actions.**

**Project / region:** `infra/environments/dev.tfvars` (us-east1).

---

## Prerequisites

- [ ] Phases A–F platform path complete (cluster, Helm, ESO, Jobs)
- [ ] `gcloud`, `kubectl`, `helm`, Docker
- [ ] Artifact Registry push access for `us-east1-docker.pkg.dev/.../cloudshiftg`

```bash
kubectl -n development get deploy cloudshiftg-web cloudshiftg-worker
helm -n development history cloudshiftg
```

---

## Capacity / quota (Autopilot)

`SSD_TOTAL_GB` in `us-east1` may be capped (e.g. 250 GB) and **not increasable** on
trial/free projects. Scale-up then fails with `GCE quota exceeded`, and surge pods
stay **Pending**.

Before upgrade/rollback (or Terraform Jobs):

```bash
kubectl -n development scale deploy/cloudshiftg-worker --replicas=0
```

Restore after smoke when you need audits/comparisons:

```bash
kubectl -n development scale deploy/cloudshiftg-worker --replicas=1
```

Keep `web.replicas: 1` ([values-development.yaml](../deploy/helm/cloudshiftg/values-development.yaml)).
Leave `migrate.enabled: false` so upgrades do not stall on migrate Jobs.

---

## G1 — Chart RollingUpdate

Web/worker Deployments use:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

- [x] Chart templates include the strategy above

---

## G2 — Build and push `web:phase-g`

Ships Phase F Job fixes (`SESSION_SECRET` on Jobs, `imagePullPolicy: Always`,
Job-safe env, terraform plugin cache under tmpdir in terraform-job image already).

```bash
export PROJECT_ID=project-7fe2c753-1df6-4821-bf9
export REGION=us-east1
export REGISTRY=${REGION}-docker.pkg.dev/${PROJECT_ID}/cloudshiftg

gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
docker build -f Dockerfile -t ${REGISTRY}/web:phase-g .
docker push ${REGISTRY}/web:phase-g
```

Worker and terraform-job can stay on `phase-c` for this prove.

- [x] `web:phase-g` pushed

---

## G3 — Helm upgrade

Record the current revision first:

```bash
helm -n development history cloudshiftg
# note PREV_REVISION (the revision currently deployed before upgrade)
```

```bash
export PROJECT_ID=project-7fe2c753-1df6-4821-bf9
export REGION=us-east1
export REGISTRY=${REGION}-docker.pkg.dev/${PROJECT_ID}/cloudshiftg

helm upgrade cloudshiftg deploy/helm/cloudshiftg \
  --namespace development \
  -f deploy/helm/cloudshiftg/values-development.yaml \
  --set image.registry=${REGISTRY} \
  --set image.webTag=phase-g \
  --set image.workerTag=phase-c \
  --set image.terraformJobTag=phase-c \
  --set env.GCP_PROJECT_ID=${PROJECT_ID} \
  --set cloudsql.instanceConnectionName=${PROJECT_ID}:${REGION}:cloudshiftg-pg-development \
  --set serviceAccount.web.gcpServiceAccount=cloudshiftg-web@${PROJECT_ID}.iam.gserviceaccount.com \
  --set serviceAccount.worker.gcpServiceAccount=cloudshiftg-worker@${PROJECT_ID}.iam.gserviceaccount.com \
  --set serviceAccount.terraformJob.gcpServiceAccount=cloudshiftg-tf-job@${PROJECT_ID}.iam.gserviceaccount.com \
  --set migrate.enabled=false \
  --wait --timeout 15m

kubectl -n development rollout status deploy/cloudshiftg-web --timeout=10m
kubectl -n development get deploy cloudshiftg-web -o jsonpath="{.spec.template.spec.containers[0].image}{'\n'}"
```

Smoke:

```bash
kubectl -n development port-forward svc/cloudshiftg-web 8081:80
curl -fsS http://127.0.0.1:8081/api/health
curl -fsS http://127.0.0.1:8081/api/ready
```

- [x] Upgrade revision recorded: **5**
- [x] Image is `.../web:phase-g`
- [x] health + ready OK after upgrade

---

## G4 — Helm rollback

```bash
helm -n development rollback cloudshiftg <PREV_REVISION> --wait --timeout 15m
kubectl -n development rollout status deploy/cloudshiftg-web --timeout=10m
kubectl -n development get deploy cloudshiftg-web -o jsonpath="{.spec.template.spec.containers[0].image}{'\n'}"

# smoke again (new port-forward if needed)
curl -fsS http://127.0.0.1:8081/api/health
curl -fsS http://127.0.0.1:8081/api/ready
```

- [x] Rolled back to revision: **6** (Rollback to 4)
- [x] Image restored (typically `.../web:phase-c`)
- [x] health + ready OK after rollback

Optional: upgrade again to `phase-g` and leave development on the fixed web image.

---

## Live prove status (2026-08-22)

| Step | Evidence |
|------|----------|
| Pre-upgrade revision | **4** (`web:phase-c`, deployed) |
| Post-upgrade revision | **5** (`web:phase-g`, RollingUpdate `maxUnavailable:0` / `maxSurge:1`) |
| Post-rollback revision | **6** (Rollback to 4 → `web:phase-c`) |
| health/ready after upgrade | OK — `{"status":"ok"}` / `{"status":"ready","db":"connected"}` via port-forward `:8081` |
| health/ready after rollback | OK — same smoke on `:8081` |
| Left on | Re-upgraded to **revision 7** `web:phase-g` (Job fixes retained); worker replicas **0** / HPA off for SSD quota headroom |

Worker was scaled to 0 and a stuck Terraform Job deleted before upgrade so Autopilot surge could schedule (SSD quota capped).

---

## Definition of done

- [x] Checklist written
- [x] Helm RollingUpdate (`maxUnavailable: 0`, `maxSurge: 1`) on web/worker
- [x] `web:phase-g` built and pushed
- [x] `helm upgrade` on development completed; health + ready OK
- [x] `helm rollback` completed; health + ready OK
- [x] Quota/capacity notes documented (worker scale-down)

**Handoff:** Deploy mechanics proven without Actions. Development is on `web:phase-g`. Scale worker back when needed for audits:

```bash
kubectl -n development scale deploy/cloudshiftg-worker --replicas=1
```

(Re-enable HPA in a future Helm upgrade if desired: `--set worker.hpa.enabled=true`.)

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Surge pod Pending / FailedScaleUp | SSD/CPU quota; scale worker to 0 |
| `helm upgrade` waits forever | `migrate.enabled` Job hook; set `migrate.enabled=false` |
| Image still `phase-c` after upgrade | `--set image.webTag=phase-g`; `helm get values -n development cloudshiftg` |
| health OK, ready fail | Cloud SQL proxy sidecar / `APP_DATABASE_URL` secret |

---

## Out of scope

- GitHub Actions / WIF deploy  
- Staging / production Helm cutover  
- HTTPS Ingress  
- Product E2E re-prove (Phase F)  
- Raising GCE SSD quota when the project is ineligible  
