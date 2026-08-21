# UI verification checklist

Use this after a local or cluster deploy to confirm the product still works end-to-end from the browser. Prefer a fresh tenant via `/onboarding` so you are not fighting leftover runs.

## Prep
- [ ] App loads at the expected URL (local: `http://localhost:3000`)
- [ ] `/api/health` returns OK; `/api/ready` returns OK
- [ ] Log in as a Tenant Admin (or complete onboarding)
- [ ] Settings → AWS: connection shows **Connected** (or use DEV_ADAPTER without real AWS)

## Audits (background job path)
- [ ] Open **Audits** → start a new audit
- [ ] UI returns immediately (202 path); status shows **Queued** then **Running**
- [ ] Progress / services update while the run is active
- [ ] Run finishes **Succeeded** (or clear **Failed** with a readable error)
- [ ] Open the audit report; findings and inventory look populated
- [ ] **Infrastructure** lists resources from the latest audit

## Comparisons
- [ ] Open **Comparisons** → start a comparison (requires a successful audit)
- [ ] Status moves Queued → Running → Succeeded
- [ ] Cost table / summary cards render; AWS vs GCP rows present

## Migrations (approval + Terraform family)
- [ ] Open **Migrations** → create a plan from the latest comparison
- [ ] Select resources → save draft
- [ ] **Approve** the plan (only Tenant Admin)
- [ ] **Generate Terraform** → run goes Queued/Running → Succeeded with plan output
- [ ] **Execute / Apply** only after a successful plan (expect real GCP cost if not using a dry project)
- [ ] Verification panel shows healthy / unhealthy checks as designed
- [ ] **Rollback** requires typed confirmation; destroys only when confirmed

## Jobs & Audit Log
- [ ] **Jobs** lists the audit, comparison, terraform, apply, and rollback runs for this tenant
- [ ] **Audit Log** shows AUDIT_STARTED, COMPARISON_STARTED, TERRAFORM_GENERATED, etc. with your admin email

## RBAC / isolation smoke
- [ ] Tenant Member can view audits/comparisons but cannot start audits or approve migrations
- [ ] Platform Operator can see platform metadata; cannot see another tenant’s AWS role ARN
- [ ] A second tenant cannot see the first tenant’s audit IDs in the UI or by guessing URLs

## Failure / resilience (optional)
- [ ] With `JOB_RUNTIME=pubsub` and worker stopped: starting an audit leaves it **Queued**, then reconcile marks it failed after ~5 minutes (or start the worker and watch it complete)
- [ ] Restart web mid-run: stale RUNNING reconciles to Failed on next list poll (~20–30 min threshold depending on job type)

## GKE-specific UI checks
- [ ] Ingress URL serves login over HTTPS
- [ ] Start audit while watching `kubectl logs -l app.kubernetes.io/component=worker`
- [ ] Start terraform while watching `kubectl get jobs -w` (Job pods appear and complete)
