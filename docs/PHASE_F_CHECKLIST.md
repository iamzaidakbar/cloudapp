# Phase F — Product E2E on GKE development

Prove **audit → comparison → migration generate** (Terraform as a Kubernetes Job)
on Autopilot namespace `development`. **No GitHub Actions.**

**Project / region:** `infra/environments/dev.tfvars` (us-east1).

---

## Prerequisites

- [ ] Phases A–E complete (cluster, ESO/AWS, Jobs + proxy, monitoring)
- [ ] `kubectl` on the cluster
- [ ] Development web + worker Ready (`JOB_RUNTIME=k8s-job`)

```bash
kubectl -n development get deploy cloudshiftg-web cloudshiftg-worker
kubectl -n development exec deploy/cloudshiftg-web -c web -- printenv JOB_RUNTIME
```

---

## F1 — Access

```bash
kubectl -n development port-forward svc/cloudshiftg-web 8080:80
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/ready
```

Browser: http://127.0.0.1:8080 — log in as a **Tenant Admin** (`/login` or `/onboarding`).  
Do **not** use Platform Operator for product APIs.

- [ ] health + ready OK
- [ ] Tenant Admin session

---

## F2 — AWS connection

Settings → AWS (`/settings/aws`): connection **CONNECTED**, trust Principal is a real ARN (Phase B).

If still on Dev Adapter, product path can still run (simulated inventory) — note that in DoD.

- [ ] AWS connected (or Dev Adapter noted)

---

## F3 — Audit + Comparison (Pub/Sub → worker)

1. `/audits` → **Run Audit** → wait until Succeeded  
2. `/comparisons` → **Run Comparison** → Succeeded  

```bash
kubectl -n development logs deploy/cloudshiftg-worker -c worker --tail=80
# expect start AUDIT / done AUDIT, start COMPARISON / done COMPARISON
```

- [ ] Audit Succeeded
- [ ] Comparison Succeeded

---

## F4 — Migration generate (k8s Job)

1. `/migrations/new` — select **one small** resource (prefer non-VPC) → create plan  
2. Approve Migration  
3. **Generate Terraform**  

```bash
kubectl -n development get jobs -l app=cloudshiftg --sort-by=.metadata.creationTimestamp
kubectl -n development logs job/<name> -c terraform-job --tail=50
```

- [ ] TERRAFORM Job Succeeded
- [ ] Plan shows generated HCL / status OK in UI

---

## F5 — Apply (optional)

**Execute Migration** only if the plan is a single tiny safe resource.  
Otherwise skip APPLY and record the reason below.

- [ ] APPLY Succeeded **or** skipped: ________________

Rollback only if apply created real GCP resources.

---

## Live prove status (2026-08-22)

**Automated / agent:**

- [x] Development web + worker Ready; `JOB_RUNTIME=k8s-job`
- [x] Port-forward health + ready OK
- [x] Phase F Tenant Admin / AWS connection verified (tenant External ID + trust)
- [x] Audit + Comparison Succeeded (after IAM trust)
- [x] At least one TERRAFORM k8s Job Succeeded (manual retry after SESSION_SECRET + plugin-cache fixes; SSD quota required worker scale-down)
- [x] APPLY skipped (optional; not required for Phase F DoD)

**Capacity note:** `SSD_TOTAL_GB` us-east1 at cap (~250 GB); Autopilot scale-up may fail. Scale worker to 0 before Terraform Jobs / Helm surge if pods stay Pending.

---

## Definition of done

- [x] Checklist + Phase E handoff
- [x] Platform ready (`JOB_RUNTIME=k8s-job`, health/ready)
- [x] Audit Succeeded on development
- [x] Comparison Succeeded on development
- [x] At least one TERRAFORM k8s Job Succeeded
- [x] APPLY explicitly skipped

**Handoff:** Phase G next — see [PHASE_G_CHECKLIST.md](./PHASE_G_CHECKLIST.md) (Helm rolling upgrade + rollback; no GitHub Actions).

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Audits stay Queued | Worker replicas / logs; Pub/Sub subscription |
| Dev Adapter banner | Pods missing `AWS_*` (Phase B) |
| AssumeRole denied | Tenant role trust Principal must match app IAM ARN |
| TERRAFORM Job CrashLoop / DB errors | `CLOUDSQL_INSTANCE_CONNECTION_NAME` on web; proxy sidecar on Job |
| Job not created | Web RBAC `batch/jobs`; `TERRAFORM_JOB_IMAGE` set |

---

## Out of scope

- GitHub Actions  
- Staging / production product E2E  
- HTTPS Ingress  
- Full README overhaul  
