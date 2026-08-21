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

## Live prove status (2026-08-21)

**Automated / agent:**

- [x] Development web + worker Ready; `JOB_RUNTIME=k8s-job`
- [x] Port-forward health + ready OK (`8080`)
- [x] Phase F Tenant Admin registered (org “Phase F Prove”) for API smoke
- [x] APPLY skipped (blocked until audit/compare succeed)

**Blocked on your AWS IAM (required for F3–F4):**

App identity is `arn:aws:iam::272694330558:user/cloudshiftg-app`.  
AssumeRole into candidate roles failed (trust / External ID).

**You do this once in AWS**, then finish F3–F4 in the browser:

1. Open the IAM role you use for CloudShift-G (or create one).
2. Trust policy Principal = `arn:aws:iam::272694330558:user/cloudshiftg-app`
3. Condition `sts:ExternalId` = the External ID shown in **Settings → AWS** for your tenant
4. Port-forward → login as Tenant Admin → Run Audit → Run Comparison → Migration Generate

```bash
kubectl -n development port-forward svc/cloudshiftg-web 8080:80
# http://127.0.0.1:8080
```

Until trust is fixed, product E2E cannot complete with real AWS on GKE (keys are present; Dev Adapter is not used).

---

## Definition of done

- [x] Checklist + Phase E handoff
- [x] Platform ready (`JOB_RUNTIME=k8s-job`, health/ready)
- [ ] Audit Succeeded on development *(user: after IAM trust)*
- [ ] Comparison Succeeded on development *(user: after IAM trust)*
- [ ] At least one TERRAFORM k8s Job Succeeded *(user: after IAM trust)*
- [x] APPLY explicitly skipped until F3–F4 succeed

**Handoff:** Phase G next (Helm rolling upgrade + rollback demo) once F3–F4 checkboxes are ticked, or in parallel if you only need deploy mechanics.

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
