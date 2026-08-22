# CloudShift-G

CloudShift-G is an enterprise-grade, **multi-tenant** AWS → GCP migration and optimization platform. Any number of customer organizations ("tenants") can register independently and connect their own AWS account; each tenant's data — inventory, reports, jobs, and logs — is isolated from every other tenant at the data, API, and job layers (PostgreSQL row-level security + explicit tenant scoping on every query, not just frontend visibility). Three roles: **Tenant Admin** (connects the AWS account, runs audits, views reports, approves and triggers migrations), **Tenant Member** (read-only access to their own tenant's audits and reports), and **Platform Operator** (a superuser with no tenant of their own — sees every tenant's non-credential metadata, never AWS role ARNs or external IDs). Registration is self-service at `/onboarding` — no manual DB inserts.

This README covers what's built so far: the **application foundation** (authentication, dashboard shell), **multi-tenant self-service onboarding + AWS connection management** (register an org, connect its AWS account, no admin gate or one-tenant cap), **role-based access control** (Tenant Admin / Tenant Member / Platform Operator, enforced at the API layer via a small set of `requireX()` guards — never frontend-only — plus a `POST /api/team` endpoint for adding a second Admin or a Member to an existing tenant), **AWS infrastructure auditing** (real multi-service AWS inventory, findings, and a browsable Infrastructure catalog), **AWS → GCP comparison** (real service/cost mapping against live AWS Price List + GCP Cloud Billing Catalog pricing), **migration planning** (select resources from a comparison, create a plan, real Tenant Admin approval gate), **Terraform generation** (real HCL generation + a real `terraform validate`/`plan` against your actual GCP project), **migration execution** (a real `terraform apply` — this genuinely provisions billable GCP infrastructure), **verification** (real, live GCP REST health checks confirming provisioned resources are genuinely healthy right now, not just that they were created successfully), **rollback** (a real `terraform destroy`, gated behind a typed confirmation, with Cloud SQL's `deletion_protection` handled automatically), **Jobs** (a tenant-scoped history feed across every audit/comparison/Terraform/apply/verification/rollback run), and **Audit Log** (a record of every admin action — who did what, when, including failed login attempts — distinct from both AWS Infrastructure Auditing and Job History). Data transfer/cutover and the real GKE deployment integration are not built yet — their sidebar links exist but 404 until each is implemented.

## Tech stack

- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS, Ubuntu / Ubuntu Mono typography, dark mode
- PostgreSQL + Prisma (`@prisma/adapter-pg` driver adapter) with row-level security for tenant isolation — every tenant-scoped table is `FORCE ROW LEVEL SECURITY`'d, the app connects as a real restricted, non-superuser DB role (`cloudshiftg_app`) that RLS actually applies to, and `tenantId` is always derived from the authenticated admin's own session (`admin.tenantId`), never a request param or a "the current tenant" lookup
- `iron-session` for authentication (encrypted, `httpOnly` session cookie)
- `@aws-sdk/client-sts` for real cross-account AWS role verification, with a clearly-labeled simulated dev adapter for local testing without an AWS account
- `@aws-sdk/client-{ec2,s3,rds,lambda,elastic-load-balancing-v2,iam,cloudwatch-logs,cloudwatch,cost-explorer}` for real multi-service AWS infrastructure inventory, using the same short-lived assumed-role credentials, plus the same dev-adapter pattern for local testing
- `@aws-sdk/client-pricing` (AWS Price List API) + the GCP Cloud Billing Catalog REST API (plain `fetch`, API-key auth) for real AWS→GCP cost comparison, cached in Postgres with a documented TTL — never hardcoded prices — plus the same dev-adapter pattern for local testing
- The `terraform` CLI, invoked as a real subprocess (`init`/`validate`/`plan`/`show`/`apply`/`destroy`), authenticating via your local `gcloud auth application-default login` session — no service-account key file is ever generated or stored. `destroy` is only ever reachable through Rollback's full guard chain (plan not already cancelled/rolled back, real provisioned resources on record, typed confirmation matched server-side) — see `lib/terraform/cli.ts`.
- The `gcloud` CLI / `google-auth-library` (via `lib/gcp/auth.ts`) for GCP access tokens — Workload Identity on GKE, ADC locally
- Background jobs via `lib/jobs` (`JOB_RUNTIME=inline|pubsub|k8s-job`): local default is inline (`after()`); GKE uses Pub/Sub workers for audits/comparisons and Kubernetes Jobs for terraform/apply/rollback

## Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)
- For the Terraform generation feature only: the [`terraform` CLI](https://developer.hashicorp.com/terraform/install) and the [`gcloud` CLI](https://cloud.google.com/sdk/docs/install), with `gcloud auth application-default login` already run once. Every other feature works without these.

## Getting started

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string for the Prisma CLI (migrate/studio/seed) — the bootstrap superuser role. |
| `APP_DATABASE_URL` | Postgres connection string the **running app** uses at runtime — a separate, unprivileged role, required so row-level security policies actually apply (the bootstrap superuser always bypasses RLS). |
| `SESSION_SECRET` | ≥32-char random string used to encrypt the session cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD` / `PLATFORM_OPERATOR_NAME` | Credentials for the Platform Operator account — the one role that can never self-register (it has no tenant of its own), so it's created by the seed script. Tenant Admins register themselves at `/onboarding` — no seed step needed for them. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` / `AWS_REGION` | Optional. CloudShift-G's own AWS identity, used only to call `sts:AssumeRole` against a tenant-provided role ARN. Leave unset to use the simulated dev adapter. |
| `AWS_COST_EXPLORER_ENABLED` | Optional, defaults to unset (off). Cost Explorer's `GetCostAndUsage` costs a small real fee per API call and needs up to 24h to populate on a fresh account — it's never called just because AWS credentials are configured. Set to `"true"` to opt in once you're ready. |
| `GCP_BILLING_API_KEY` | Optional. An API key for any GCP project with the "Cloud Billing API" enabled — used only to read public GCP list pricing for the comparison feature (global public pricing, not tied to a specific billing account; no OAuth/service account needed). Leave unset to use the simulated dev adapter for GCP pricing. AWS-side comparison pricing needs no separate credential — it reuses `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` above (a direct call, not cross-account, since price list data isn't tenant-scoped). |
| `GCP_PROJECT_ID` | Required only for Terraform generation — the real GCP project generated Terraform targets, and that `terraform plan` runs against. No dev-adapter fallback (generating config with no target project is meaningless). Authenticates via ADC / Workload Identity, not a stored key. |
| `JOB_RUNTIME` | Optional. `inline` (local default), `pubsub` (audits/comparisons via Pub/Sub worker), or `k8s-job` (terraform family as Kubernetes Jobs; audits/comparisons still use Pub/Sub). |
| `PUBSUB_TOPIC_PREFIX` | Optional. Defaults to `cloudshiftg`. |
| `TERRAFORM_JOB_IMAGE` / `K8S_NAMESPACE` | Required when using `k8s-job` runtime for terraform/apply/rollback. |

## Database setup

```bash
docker compose up -d          # starts local Postgres on :5432, plus one-time role setup (see below)
npm run prisma:migrate        # applies migrations (prompts for a name on first run; use "init")
npm run prisma:seed           # creates/updates the Platform Operator from PLATFORM_OPERATOR_EMAIL/_PASSWORD
```

On first container creation, `db/init/01-create-app-role.sql` automatically creates a second, unprivileged Postgres role (`cloudshiftg_app`) that the running application connects as. This matters because the bootstrap role (`cloudshiftg`, used by the Prisma CLI for migrations) is a Postgres **superuser**, and superusers always bypass row-level security — the app must never connect as that role, or RLS policies on tenant-owned tables silently do nothing. If you already had a Postgres volume from before this existed, run the SQL in that file manually against your running container once.

`npm run prisma:studio` opens a GUI on the database if you want to inspect rows directly (connects via `DATABASE_URL`, so it can see everything regardless of RLS).

## Running locally

```bash
npm run dev
# Optional (only if JOB_RUNTIME=pubsub locally):
# npm run worker
```

Open http://localhost:3000 (Next.js falls back to the next free port if 3000 is taken). Either register a new organization at `/onboarding` (self-service — creates a Tenant and its first Tenant Admin) or log in as the seeded Platform Operator with `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD` from your `.env`.

## Project structure

```
app/
  login/                    Login page
  onboarding/                4-step tenant + AWS connection wizard (standalone, no sidebar)
  (dashboard)/              Authenticated shell: Sidebar + Header + page content
    dashboard/               Dashboard page (CTA until connected, latest-audit summary after)
    settings/                Settings index + AWS Connection management page
    audits/                  Audit run list + report (real-time polling, per-service progress)
    infrastructure/          Resource catalog (filters/search/pagination) + resource detail
    comparisons/             Comparison run list + report (AWS vs GCP cost table, real-time polling)
    migrations/              Migration plan list + resource-selection form + plan detail (approve/cancel/Terraform/Execute)
  api/
    auth/login, auth/logout  Session endpoints
    onboarding/tenant        Creates the (one) Tenant + its AwsConnection stub
    aws/connection           Read connection state / update the role ARN
    aws/connection/verify    Runs real-or-simulated STS verification
    audits                   Start/list audit runs
    audits/[id]               Poll one run's status + per-service progress
    audits/[id]/findings      Paginated, filterable findings for one run
    infrastructure            Paginated/filterable resource catalog
    infrastructure/[id]       One resource + its findings
    comparisons               Start/list comparison runs (sourced from the latest successful audit)
    comparisons/[id]           Poll one run's status + priced items
    migrations                 Create/list migration plans (sourced from the latest successful comparison)
    migrations/[id]             One plan + its resources
    migrations/[id]/approve      Real approval gate
    migrations/[id]/cancel       Discard a draft plan
    migrations/[id]/terraform    Generate + validate + real-plan Terraform for an approved plan
    migrations/[id]/apply        Real terraform apply — provisions real, billable GCP infrastructure
    health, ready             Liveness / readiness (readiness pings Postgres)
    dashboard/summary        Real Prisma-backed dashboard data
components/
  layout/                   Sidebar, Header, nav items, admin menu
  onboarding/               Wizard steps
  settings/                 AWS connection panel
  audits/                   Run button, status badge, report view, findings panel
  infrastructure/           Filter bar, table, resource detail tabs
  comparisons/              Run button, runs table, report view, summary cards, items table
  migrations/               Status badge, resource selector (checkboxes), runs table, resources table, summary cards, approve/cancel actions, Terraform panel, Apply (execute) panel
  findings/                 Severity badge, findings table, filter bar (shared)
  aws/                      Connection status/summary, data-source (dev-adapter) badge
  shared/                   Cross-page data-table shell (pagination + empty-state switch), hydration-safe date/time
  dashboard/                Summary cards, onboarding CTA, latest-audit/comparison/migration summaries
  auth/                     Login form
  ui/                       shadcn/ui primitives
lib/
  jobs/                     enqueue adapters (inline / Pub/Sub / K8s Job), handlers, types
  auth/                     Session, password hashing, auth guards
  aws/                      STS integration, dev adapter, verification orchestrator
    audit/                   Real AWS collectors, dev adapter, findings engine, job runner
  gcp/                      Auth (ADC / Workload Identity), billing configured check
  pricing/                  AWS Price List + GCP Billing Catalog fetchers, pricing cache, AWS<->GCP
                             instance mapping, dev adapter, comparison job runner
  terraform/                HCL generator (generate.ts), the only module that ever spawns a `terraform`
                             subprocess (cli.ts — init/validate/plan/show/apply/destroy), the
                             Terraform + apply + rollback job runners, stale-run reconciliation
  db/with-tenant.ts         Row-level-security session context helper
  tenant.ts, audits.ts, infrastructure.ts, comparisons.ts, migrations.ts, terraform-runs.ts, apply-runs.ts
                             Shared tenant/audit/resource/comparison/migration/Terraform/apply read+write helpers
  api/pagination.ts         Shared pagination query-param parsing
  validation/               Zod schemas
  db.ts, env.ts, decimal.ts, format.ts   Prisma client, validated env vars, serialization helpers
workers/
  main.ts                   Pub/Sub consumer + one-shot K8s Job entrypoint
infra/                      Platform Terraform (Autopilot, VPC, AR, SQL, Pub/Sub, WI)
deploy/
  helm/cloudshiftg/         Helm chart (web, worker, Ingress, HPA, PDB, NetworkPolicy)
  cloudrun/                 Parallel Cloud Run path
prisma/
  schema.prisma, seed.ts, migrations/
db/init/                    One-time Postgres role setup (mounted into the container)
proxy.ts                    Route guard (Next.js 16's replacement for middleware.ts)
docker-compose.yml           Local Postgres
Dockerfile*                 web / worker / terraform-job images
```

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Verify credentials, issue session cookie |
| POST | `/api/auth/logout` | Admin | Destroy session |
| GET | `/api/dashboard/summary` | Admin | Real admin-account count + last login |
| POST | `/api/onboarding/tenant` | Admin | Create the organization (409 if one already exists) |
| GET | `/api/aws/connection` | Admin | Current tenant + AWS connection + CloudShift-G's own AWS identity |
| PATCH | `/api/aws/connection` | Admin | Update the role ARN (resets connection status) |
| POST | `/api/aws/connection/verify` | Admin | Runs `sts:AssumeRole` + `sts:GetCallerIdentity` (or the dev adapter) |
| POST | `/api/audits` | Admin | Starts a real background audit run (409 if one is already in progress) |
| GET | `/api/audits` | Admin | Paginated audit run history |
| GET | `/api/audits/:id` | Admin | One run's status + per-service progress — the polling endpoint |
| GET | `/api/audits/:id/findings` | Admin | Paginated findings for one run, filterable by `severity`/`type` |
| GET | `/api/infrastructure` | Admin | Paginated/filterable resource catalog from the latest successful audit |
| GET | `/api/infrastructure/:id` | Admin | One resource + its findings |
| POST | `/api/comparisons` | Admin | Starts a real background comparison run against the latest successful audit (400 if none exists, 409 if one is already in progress) |
| GET | `/api/comparisons` | Admin | Paginated comparison run history |
| GET | `/api/comparisons/:id` | Admin | One run's status + priced items — the polling endpoint |
| POST | `/api/migrations` | Admin | Creates a migration plan from selected comparison items (400 if no successful comparison exists, or if selection is empty/stale) |
| GET | `/api/migrations` | Admin | Paginated migration plan history |
| GET | `/api/migrations/:id` | Admin | One plan + its resources |
| POST | `/api/migrations/:id/approve` | Admin | Real approval gate — 400 if the plan isn't `DRAFT` |
| POST | `/api/migrations/:id/cancel` | Admin | Discards a `DRAFT` plan — 400 if already approved/cancelled |
| POST | `/api/migrations/:id/terraform` | Admin | Generates real Terraform + runs a real `init`/`validate`/`plan` (400 if the plan isn't `APPROVED` or `GCP_PROJECT_ID` isn't set, 409 if already running) |
| GET | `/api/migrations/:id/terraform` | Admin | Latest Terraform run for the plan — the polling endpoint |
| POST | `/api/migrations/:id/apply` | Admin | Runs a real `terraform apply` — provisions real, billable GCP infrastructure (400 if there's no successful `plan` on record, 409 if already running) |
| GET | `/api/migrations/:id/apply` | Admin | Latest apply run for the plan — the polling endpoint |
| GET | `/api/health` | — | Liveness (no DB dependency) |
| GET | `/api/ready` | — | Readiness (real `SELECT 1` against Postgres) |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / start |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Run a new migration in dev |
| `npm run prisma:seed` | Upsert the Platform Operator account from `.env` |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run worker` | Start the Pub/Sub worker (`workers/main.ts`) |
| `npm run worker:dev` | Worker with file watch |

## Deploy (GKE Autopilot)

Platform infra lives under `infra/` (VPC, Autopilot cluster, Artifact Registry, Cloud SQL, Pub/Sub, Workload Identity GSAs, Secret Manager shells). App charts live under `deploy/helm/cloudshiftg`. Cloud Run remains available as a parallel path under `deploy/cloudrun/` until GKE production is approved.

```bash
# 1) Platform
cd infra && terraform init && terraform apply -var-file=environments/dev.tfvars

# 2) Images
docker build -t $REGISTRY/web:$TAG -f Dockerfile .
docker build -t $REGISTRY/worker:$TAG -f Dockerfile.worker .
docker build -t $REGISTRY/terraform-job:$TAG -f Dockerfile.terraform-job .

# 3) Migrate, then Helm
npx prisma migrate deploy
helm upgrade --install cloudshiftg deploy/helm/cloudshiftg -n development --create-namespace \
  --set image.registry=$REGISTRY --set image.webTag=$TAG ...
```

CI: `.github/workflows/deploy-gke.yml` (build → AR → migrate → Helm). Observability notes: `deploy/OBSERVABILITY.md`.

## Access (local + GKE development)

**Local:** `npm run dev` → http://localhost:3000

**GKE `development` (port-forward):**

```bash
kubectl -n development port-forward svc/cloudshiftg-web 8081:80
# http://127.0.0.1:8081
```

**Public HTTPS without a domain (Cloudflare Quick Tunnel):** keep port-forward running, then in a second terminal:

```bash
cloudflared tunnel --url http://127.0.0.1:8081
```

Copy the printed `https://….trycloudflare.com` URL. It changes every time you restart the tunnel; both processes must stay running on your laptop.

**Capacity note (Autopilot SSD quota):** scale the worker to `0` before Terraform/Apply/Rollback Jobs; scale to `1` only when running audits/comparisons:

```bash
kubectl -n development scale deploy/cloudshiftg-worker --replicas=0
kubectl -n development scale deploy/cloudshiftg-worker --replicas=1
```

## Verification checklist

**Foundation**
1. `docker compose up -d`, then `npm run prisma:migrate` and `npm run prisma:seed`.
2. `npm run dev`, open the app — redirected to `/login`. Wrong password shows a real error. Correct login redirects to `/dashboard` with a real summary card.
3. Logout clears the session cookie and redirects to `/login`.

**Onboarding + AWS Connection**
4. On first login, `/dashboard` shows a "Connect your AWS account" CTA. Clicking it opens `/onboarding`, a standalone 4-step wizard.
5. Step 1 creates a real `Tenant` row. Step 2 shows a genuinely random External ID and a sample trust policy. Step 3's "Verify Connection" calls the real verification path.
6. Without `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` set, verification uses the simulated dev adapter — a visible amber "Simulated (Dev Adapter)" badge always appears, never silently indistinguishable from a real connection. A role ARN containing `fail` exercises the failure path.
7. With real AWS credentials configured and a real IAM role trusting CloudShift-G's own identity (shown at `/settings/aws` via `GET appIdentity`), verification performs a genuine `sts:AssumeRole` + `sts:GetCallerIdentity` and returns the real AWS account ID — no simulated badge.
8. Revisiting `/onboarding` after completion redirects to `/settings/aws`, which supports re-verifying and reconnecting (editing the role ARN) without going back through the wizard.
9. Confirm row-level security is real, not just declared: connect via `psql` as the `cloudshiftg` role and `SELECT * FROM aws_connections` **without** setting `app.tenant_id` — expect 0 rows even though data exists, because the app's actual runtime role (`cloudshiftg_app`) is not a superuser and the policy is `FORCE`d.

**AWS Infrastructure Audit**
10. Once connected, `/audits` shows a "Run Audit" button. Clicking it returns immediately (202) and redirects to the report, which polls every 3s and shows each of the 10 AWS services flipping from pending to succeeded/failed independently and in real time — not a client-side progress animation.
11. Without real AWS credentials, the dev adapter seeds at least one of every finding type (public S3 bucket, unencrypted/unattached EBS, underutilized/over-provisioned EC2, missing tags) so the findings table and severity filter are exactly verifiable, and deterministically fails one service every 4th run to exercise the partial-failure UI.
12. With real AWS credentials but no permissions granted yet, every service correctly reports a real `AccessDenied` error and the run still completes — partial/total failure never crashes the job or hides what failed.
13. `/infrastructure` reads only from the latest **successful** run (not live AWS calls); running a second audit updates it to that run's snapshot while `/audits` keeps both in history for comparison.
14. Starting a second audit while one is already running returns 409; killing the dev server mid-run and reloading `/audits` afterward flips the orphaned run to `FAILED` instead of leaving it stuck (`reconcileStaleAuditRuns`).
15. RLS holds on all four new tables the same way as `aws_connections` (see #9).

**AWS → GCP Comparison**
16. `/comparisons` requires a successful audit first — "Run Comparison" is disabled with a tooltip until one exists. Once available, clicking it returns immediately (202) and redirects to the report, which polls every 3s and shows priced items appearing progressively as each is priced — not a fake progress bar.
17. EC2, RDS, and S3 resources get real like-for-like and (where CloudWatch utilization shows <10% average CPU) optimized GCP sizing recommendations; Lambda shows a real service mapping with AWS cost marked "usage-based — not collected" (an intentional, documented boundary, not a bug); VPC shows a $0 mapping on both sides.
18. Without real AWS/GCP credentials, the dev adapter prices all 5 comparable service types with plausible simulated numbers, always showing the amber "Simulated (Dev Adapter)" badge for each side independently — a comparison never mixes real AWS dollars with simulated GCP dollars or vice versa; if either side isn't configured, the whole run falls back to simulated on both sides.
19. `PricingCache` rows populate on a real run (24h TTL for prices, 7 days for GCP's service-ID resolution) — a second comparison shortly after the first should not re-hit either external pricing API for the same instance type/region.
20. RLS holds on `comparison_runs`/`comparison_items` the same way as `aws_connections` (see #9); `pricing_cache` is deliberately **not** tenant-scoped (public list pricing, identical for every tenant) and has no RLS policy.
21. The dashboard's "Latest Comparison" card and Est. GCP Monthly Cost figure reflect the latest successful comparison run.

**Migration Planning**
22. `/migrations` requires a successful comparison first — "New Migration" is disabled with a tooltip until one exists with at least one non-VPC resource. `/migrations/new` lists every EC2/S3/RDS/Lambda item from the latest comparison (VPCs are excluded — not individually migratable) with checkboxes and a live-updating selection summary (count + total migration cost).
23. Creating a plan is synchronous (no job/polling — it's a fast DB write from already-priced comparison data) and redirects straight to the plan detail page, showing `DRAFT` status, the selected resources, and cost totals.
24. "Approve Migration" is a real gate: it records `approvedAt`/`approvedByAdminId`, and re-approving an already-approved (or cancelled) plan is rejected with 400, not silently accepted. "Cancel Plan" only works on `DRAFT` plans.
25. Submitting an empty resource selection, or a `comparisonItemId` that isn't part of the current latest comparison run, is rejected with 400 rather than creating a broken plan.
26. RLS holds on `migration_plans`/`migration_resources` the same way as `aws_connections` (see #9).
27. The dashboard's "Latest Migration" card reflects the latest plan's status/cost, and `/migrations` lists all plans with correct statuses.

**Terraform Generation**
28. "Generate Terraform" only appears on an `APPROVED` plan. Clicking it returns immediately (202), and the generated `main.tf` appears in the panel right away (before validate/plan even start) — the poll then shows `QUEUED`→`RUNNING`→terminal.
29. `terraform validate` runs for real (local, no GCP calls) — a genuinely invalid generated config shows `validate failed` with the real diagnostic messages listed, not a generic error. `terraform plan` then runs for real against your actual GCP project via your local `gcloud` ADC session — it's read-only (queries state, creates nothing) and the panel shows the real "N resources would be created" count plus the full `terraform show` output.
30. Grep confirms `apply`/`destroy` are not invoked anywhere in `lib/terraform/` — clicking anything in this build cannot provision or destroy real infrastructure.
31. "Regenerate Terraform" creates a new versioned run for the same plan; history isn't lost.
32. RLS holds on `terraform_runs` the same way as `aws_connections` (see #9).

**Migration Execution**
33. "Execute Migration" only appears once a plan's latest Terraform run has a successful, real `plan` on record — never offered blind. It's styled distinctly (amber, with explicit "this creates real, billable resources" copy) from every other action in the app.
34. Clicking it runs a real `terraform apply` — confirmed against a live GCP project: a genuine 412 org-policy error from Google (missing `uniform_bucket_level_access`) and a genuine 403 (Cloud Functions API disabled) both surfaced as real, unedited error text, while an independent resource in the same run (Cloud SQL) still completed and was correctly tracked — this is real partial-failure handling, not an all-or-nothing simulation.
35. Whatever actually gets created — success or partial failure alike — is reflected in `MigrationResource.gcpResourceSelfLink`/`provisionedAt` (shown as a new column in the resources table) and in `ApplyRun.terraformState`, because Terraform's own state file is authoritative for what's real, independent of the overall command's exit code.
36. Grep `lib/terraform/` again — `destroy` still doesn't appear as an invoked subcommand anywhere, only in comments explaining its absence; `apply` does now appear, deliberately.
37. A `RUNNING` apply stuck past 30 minutes (longer than every other job's threshold — real Cloud SQL creation alone commonly takes 5–15 minutes) is auto-reconciled to `FAILED` on the next request, same self-healing pattern as every other job.
38. RLS holds on `apply_runs` the same way as `aws_connections` (see #9).

**Multi-Tenant Auth & RBAC**
39. `/onboarding` is reachable while logged out (no redirect to `/login`) — step 1 is public self-service registration: organization name + the first Tenant Admin's name/email/password, in one submission. A second, independent organization can register the exact same way, at any time — there is no "already onboarded" cap.
40. Two real, separately-registered tenants can never see each other's data via the API, confirmed by ID, not just by list-filtering: fetching Tenant A's real migration plan/audit run ID while authenticated as Tenant B's admin returns 404 (indistinguishable from nonexistent), not 403 and not the real data.
41. `POST /api/team` (Tenant Admin only) creates a second Admin or a Tenant Member on the *same* tenant with a system-generated temporary password (returned once, in the response) and `mustChangePassword: true`. A Tenant Member gets 403 on every mutating route (start audit/comparison, create/approve/cancel/apply/verify/rollback a migration, update/verify the AWS connection, add a team member) and 200 on every read route; the UI hides the corresponding buttons/panels for them too, not just the API.
42. The seeded Platform Operator logs in and lands on `/platform` (never `/dashboard`), sees every tenant's name/AWS-connection-status/admin-count, and gets 403 on every tenant-scoped route (`/api/migrations`, `/api/aws/connection`, etc.). `GET /api/platform/tenants` never returns `roleArn`/`externalId` for any tenant. A Tenant Admin gets 403 on `/api/platform/tenants`.
43. RLS holds on `admin_action_logs` with a live tenant context set, the same way as `aws_connections` (see #9) — but also confirm the two-branch policy works correctly for the genuinely tenant-less rows it must still allow: a failed login (wrong password, unknown email) logs successfully with no `adminId`/`tenantId`, and remains invisible to every real tenant's own Audit Log view.

## Troubleshooting

- **Port 5432 already in use** — stop any other local Postgres instance, or change the host port in `docker-compose.yml`.
- **"Database is not reachable" / `/api/ready` returns 503** — confirm `docker compose ps` shows the `cloudshiftg-postgres` container healthy and that `APP_DATABASE_URL` in `.env` matches it.
- **Stale Prisma types/client after editing `schema.prisma`** — run `npm run prisma:generate`, then **restart the dev server** (not just save-and-hot-reload) — the Prisma client is cached as a module-level singleton across hot reloads and won't pick up new models otherwise.
- **RLS seems to do nothing** — check the role the app actually connects as (`APP_DATABASE_URL`) is not a Postgres superuser and doesn't have `BYPASSRLS`; run `\du` in `psql` to check role attributes.
- **Port 3000 already in use** — Next.js automatically falls back to 3001; check your terminal output for the actual URL.
- **Real audits report every service as failed with AccessDenied** — expected until you attach a read-only IAM policy to the connected role. It needs, at minimum: `ec2:Describe*`, the S3 read calls (`ListAllMyBuckets`, `GetBucketLocation`/`Tagging`/`Acl`/`PolicyStatus`/`Policy`/`EncryptionConfiguration`/`PublicAccessBlock`), `rds:DescribeDBInstances`, `lambda:ListFunctions`, `elasticloadbalancing:Describe*`, `iam:ListRoles`, `logs:DescribeLogGroups`, and optionally `cloudwatch:GetMetricData` (utilization findings just don't fire without it — the audit still succeeds).
- **An audit seems stuck in "Running" or "Queued" forever** — with `JOB_RUNTIME=inline`, work runs in-process via `after()` and needs the Next.js process to stay alive. With `pubsub`, ensure the worker is running (`npm run worker` or the worker Deployment). Stale RUNNING (>20m) and abandoned QUEUED (>5m) runs are auto-reconciled to `FAILED` on the next `/api/audits*` request — reload the page.
- **Cost/utilization show "N/A" or "Unavailable"** — this is the honest state, not a bug: Cost Explorer is opt-in (`AWS_COST_EXPLORER_ENABLED`) and CloudWatch/Cost Explorer calls degrade gracefully on missing permissions rather than failing the whole audit.
- **"Run Comparison" is disabled** — a comparison sources its resources from the latest **successful** audit; run one first at `/audits`.
- **Comparison shows real AWS but simulated GCP prices, or vice versa** — this can't actually happen by design (see checklist #18) — if you see mixed real/simulated data, that's a bug, not expected degraded behavior.
- **A Lambda function's "Current AWS Cost" always shows "usage-based — not collected"** — expected; real Lambda pricing needs invocation-count + GB-second CloudWatch metrics this version doesn't collect. Its GCP mapping (Cloud Run functions) and list price still show.
- **GCP prices show "N/A" even with `GCP_BILLING_API_KEY` set** — confirm the "Cloud Billing API" is enabled on that key's GCP project (APIs & Services → Library). The Cloud SQL SKU matching in `lib/pricing/gcp-billing-catalog.ts` was verified and fixed against live SKU data (Google's own catalog inconsistently formats the vCPU vs RAM SKU descriptions for the same tier — `"Zonal - Enterprise N4 vCPU"` vs `"Zonal- Enterprise N4 RAM"`, no space before the second hyphen); if Google changes the wording again it'll need a matching update.
- **AWS-side comparison pricing (EC2/RDS/S3) shows "N/A" even with AWS credentials configured** — this uses CloudShift-G's own AWS identity directly (not the tenant's assumed role, since price list data isn't tenant-scoped), and needs a separate `pricing:GetProducts` permission on that IAM user/role — it's not covered by the audit-role's read-only policy. Attach an inline policy granting `pricing:GetProducts` (resource `*`) to fix.
- **"New Migration" is disabled** — a migration plan sources its resources from the latest **successful** comparison; run one first at `/comparisons`. If a comparison exists but only found VPCs, there's nothing selectable either (VPCs aren't individually migratable).
- **A migration plan's costs all show "N/A"** — it inherited `costAvailable: false` from every one of its source comparison items (e.g. all-Lambda selections, or a comparison that ran on the dev adapter without cost data) — not a bug, the plan just has nothing priced to sum.
- **"Execute Migration" doesn't appear on the plan detail page** — it only shows once the latest Terraform run succeeded with a real `plan` on record. Generate Terraform first.
- **"Generate Terraform" is missing / a 400 says to set `GCP_PROJECT_ID`** — required env var, no dev-adapter fallback; set it to your real target GCP project ID.
- **First "Generate Terraform"/"Execute Migration" click takes ~15–30s** — `terraform init` downloads the `hashicorp/google` provider the first time. Subsequent runs reuse the local plugin cache (`.terraform-plugin-cache/`, gitignored) and are much faster.
- **`terraform plan`/`apply` fails with a real GCP API error** (e.g. "API not enabled", or a 412 org-policy violation) — expected, and surfaced as the real, unedited error, not a generic one. For "API not enabled": `gcloud services enable compute.googleapis.com sqladmin.googleapis.com cloudfunctions.googleapis.com storage.googleapis.com --project=<your-project-id>` (only enable the services for the resource types you're actually generating). For an org-policy violation, the fix depends on the specific constraint your organization enforces.
- **`apply` fails with "Unknown zone"** — fixed: an earlier version of `lib/terraform/generate.ts` assumed every GCP region's first zone is `${region}-a`, which is false for at least `us-east1` and `europe-west1` (both skip zone "a" — confirmed live via `gcloud compute zones list`, not assumed). `lib/pricing/reference-data.ts`'s `toGcpZone()` now uses a verified per-region lookup table instead.
- **`terraform validate`/`plan`/`apply` fails with an auth error** — confirm `gcloud auth application-default login` has been run on this machine; Terraform's `google` provider picks up those Application Default Credentials automatically, no key file is used.
- **An apply partially failed but a resource is missing from the resources table's "Provisioned" column** — check `ApplyRun.applyOutput` for that specific resource's real error; independent resources in one `apply` succeed or fail independently, and only what Terraform's own state file confirms as created gets a `gcpResourceSelfLink`.
- **I created a real resource by mistake while testing and need to clean it up** — use the Rollback panel on that migration's page (real `terraform destroy`, requires typing the plan's sequence number to confirm). If the plan itself is in a state that blocks that, delete it directly via `gcloud` (e.g. `gcloud compute instances delete <name>`, `gcloud sql instances delete <name>`, `gcloud storage buckets delete <name>`) or the GCP Console — the resource's real name/self-link is in the resources table and in `ApplyRun.terraformState`.

## Roadmap

**Done on GKE `development`:** audit → compare → migrate → Terraform → Apply → Verify → Data transfer v1 (S3→GCS) → Rollback. Access via port-forward (Cloudflare Quick Tunnel optional). Staging chart uses worker `0` (SSD quota Strategy B). Ingress/custom domain deferred (no paid DNS).

**Still pending:**

| Item | Notes |
|------|--------|
| RDS → Cloud SQL transfer | Next — dump/restore after S3→GCS v1 |
| EC2 / Lambda transfer | After RDS |
| Traffic cutover | DNS / app flip |
| GitHub Actions / CI polish | Workflow exists; harden as needed |
| Production cutover (Phase K) | Prod namespace, secrets, GKE vs Cloud Run |
| Docs / CI finish (Phase L) | Runbooks beyond this README |
| Public URL | Paid domain + Ingress — deferred |
