# CloudShift-G

CloudShift-G is an AWS → GCP migration and optimization platform. The application has a single **Admin** role — there is no tenant-member or platform-operator role in this product. "Tenant" in the data model refers to the organizational/AWS-account boundary, not a UI role.

This README covers what's built so far: the **application foundation** (authentication, dashboard shell), **tenant onboarding + AWS connection management**, **AWS infrastructure auditing** (real multi-service AWS inventory, findings, and a browsable Infrastructure catalog), **AWS → GCP comparison** (real service/cost mapping against live AWS Price List + GCP Cloud Billing Catalog pricing), and **migration planning** (select resources from a comparison, create a plan, real admin approval gate). Terraform generation/execution, Jobs, Audit Log, and the real GCP/Terraform/GKE integration are not built yet — their sidebar links exist but 404 until each is implemented.

## Tech stack

- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS, Ubuntu / Ubuntu Mono typography, dark mode
- PostgreSQL + Prisma (`@prisma/adapter-pg` driver adapter) with row-level security for tenant isolation
- `iron-session` for authentication (encrypted, `httpOnly` session cookie)
- `@aws-sdk/client-sts` for real cross-account AWS role verification, with a clearly-labeled simulated dev adapter for local testing without an AWS account
- `@aws-sdk/client-{ec2,s3,rds,lambda,elastic-load-balancing-v2,iam,cloudwatch-logs,cloudwatch,cost-explorer}` for real multi-service AWS infrastructure inventory, using the same short-lived assumed-role credentials, plus the same dev-adapter pattern for local testing
- `@aws-sdk/client-pricing` (AWS Price List API) + the GCP Cloud Billing Catalog REST API (plain `fetch`, API-key auth) for real AWS→GCP cost comparison, cached in Postgres with a documented TTL — never hardcoded prices — plus the same dev-adapter pattern for local testing
- Next.js `after()` for background audit/comparison execution (fast HTTP ack, real work continues server-side) — no external job queue yet, by design; see Troubleshooting for what that means for interrupted runs

## Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)

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
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Credentials for the first (and only) Admin account. There is no signup flow — this account is created by the seed script. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` / `AWS_REGION` | Optional. CloudShift-G's own AWS identity, used only to call `sts:AssumeRole` against a tenant-provided role ARN. Leave unset to use the simulated dev adapter. |
| `AWS_COST_EXPLORER_ENABLED` | Optional, defaults to unset (off). Cost Explorer's `GetCostAndUsage` costs a small real fee per API call and needs up to 24h to populate on a fresh account — it's never called just because AWS credentials are configured. Set to `"true"` to opt in once you're ready. |
| `GCP_BILLING_API_KEY` | Optional. An API key for any GCP project with the "Cloud Billing API" enabled — used only to read public GCP list pricing for the comparison feature (global public pricing, not tied to a specific billing account; no OAuth/service account needed). Leave unset to use the simulated dev adapter for GCP pricing. AWS-side comparison pricing needs no separate credential — it reuses `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` above (a direct call, not cross-account, since price list data isn't tenant-scoped). |

## Database setup

```bash
docker compose up -d          # starts local Postgres on :5432, plus one-time role setup (see below)
npm run prisma:migrate        # applies migrations (prompts for a name on first run; use "init")
npm run prisma:seed           # creates/updates the Admin user from ADMIN_EMAIL/ADMIN_PASSWORD
```

On first container creation, `db/init/01-create-app-role.sql` automatically creates a second, unprivileged Postgres role (`cloudshiftg_app`) that the running application connects as. This matters because the bootstrap role (`cloudshiftg`, used by the Prisma CLI for migrations) is a Postgres **superuser**, and superusers always bypass row-level security — the app must never connect as that role, or RLS policies on tenant-owned tables silently do nothing. If you already had a Postgres volume from before this existed, run the SQL in that file manually against your running container once.

`npm run prisma:studio` opens a GUI on the database if you want to inspect rows directly (connects via `DATABASE_URL`, so it can see everything regardless of RLS).

## Running locally

```bash
npm run dev
```

Open http://localhost:3000 (Next.js falls back to the next free port if 3000 is taken) and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

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
    migrations/              Migration plan list + resource-selection form + plan detail (approve/cancel)
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
    health, ready             Liveness / readiness (readiness pings Postgres)
    dashboard/summary        Real Prisma-backed dashboard data
components/
  layout/                   Sidebar, Header, nav items, admin menu
  onboarding/               Wizard steps
  settings/                 AWS connection panel
  audits/                   Run button, status badge, report view, findings panel
  infrastructure/           Filter bar, table, resource detail tabs
  comparisons/              Run button, runs table, report view, summary cards, items table
  migrations/               Status badge, resource selector (checkboxes), runs table, resources table, summary cards, approve/cancel actions
  findings/                 Severity badge, findings table, filter bar (shared)
  aws/                      Connection status/summary, data-source (dev-adapter) badge
  shared/                   Cross-page data-table shell (pagination + empty-state switch), hydration-safe date/time
  dashboard/                Summary cards, onboarding CTA, latest-audit/comparison/migration summaries
  auth/                     Login form
  ui/                       shadcn/ui primitives
lib/
  auth/                     Session, password hashing, auth guards
  aws/                      STS integration, dev adapter, verification orchestrator
    audit/                   Real AWS collectors, dev adapter, findings engine, job runner
  gcp/is-configured.ts      GCP Billing API key check
  pricing/                  AWS Price List + GCP Billing Catalog fetchers, pricing cache, AWS<->GCP
                             instance mapping, dev adapter, comparison job runner
  db/with-tenant.ts         Row-level-security session context helper
  tenant.ts, audits.ts, infrastructure.ts, comparisons.ts, migrations.ts   Shared tenant/audit/resource/comparison/migration read+write helpers
  api/pagination.ts         Shared pagination query-param parsing
  validation/               Zod schemas
  db.ts, env.ts, decimal.ts, format.ts   Prisma client, validated env vars, serialization helpers
prisma/
  schema.prisma, seed.ts, migrations/
db/init/                    One-time Postgres role setup (mounted into the container)
proxy.ts                    Route guard (Next.js 16's replacement for middleware.ts)
docker-compose.yml           Local Postgres
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
| `npm run prisma:seed` | Upsert the Admin user from `.env` |
| `npm run prisma:studio` | Open Prisma Studio |

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

## Troubleshooting

- **Port 5432 already in use** — stop any other local Postgres instance, or change the host port in `docker-compose.yml`.
- **"Database is not reachable" / `/api/ready` returns 503** — confirm `docker compose ps` shows the `cloudshiftg-postgres` container healthy and that `APP_DATABASE_URL` in `.env` matches it.
- **Stale Prisma types/client after editing `schema.prisma`** — run `npm run prisma:generate`, then **restart the dev server** (not just save-and-hot-reload) — the Prisma client is cached as a module-level singleton across hot reloads and won't pick up new models otherwise.
- **RLS seems to do nothing** — check the role the app actually connects as (`APP_DATABASE_URL`) is not a Postgres superuser and doesn't have `BYPASSRLS`; run `\du` in `psql` to check role attributes.
- **Port 3000 already in use** — Next.js automatically falls back to 3001; check your terminal output for the actual URL.
- **Real audits report every service as failed with AccessDenied** — expected until you attach a read-only IAM policy to the connected role. It needs, at minimum: `ec2:Describe*`, the S3 read calls (`ListAllMyBuckets`, `GetBucketLocation`/`Tagging`/`Acl`/`PolicyStatus`/`Policy`/`EncryptionConfiguration`/`PublicAccessBlock`), `rds:DescribeDBInstances`, `lambda:ListFunctions`, `elasticloadbalancing:Describe*`, `iam:ListRoles`, `logs:DescribeLogGroups`, and optionally `cloudwatch:GetMetricData` (utilization findings just don't fire without it — the audit still succeeds).
- **An audit seems stuck in "Running" forever** — there's no external job queue/worker yet; a long-running audit relies on the Next.js process staying alive (`after()`). If the dev server was restarted mid-run, the next request to any `/api/audits*` route auto-reconciles runs stuck for >20 minutes to `FAILED` rather than leaving them stuck — just reload the page.
- **Cost/utilization show "N/A" or "Unavailable"** — this is the honest state, not a bug: Cost Explorer is opt-in (`AWS_COST_EXPLORER_ENABLED`) and CloudWatch/Cost Explorer calls degrade gracefully on missing permissions rather than failing the whole audit.
- **"Run Comparison" is disabled** — a comparison sources its resources from the latest **successful** audit; run one first at `/audits`.
- **Comparison shows real AWS but simulated GCP prices, or vice versa** — this can't actually happen by design (see checklist #18) — if you see mixed real/simulated data, that's a bug, not expected degraded behavior.
- **A Lambda function's "Current AWS Cost" always shows "usage-based — not collected"** — expected; real Lambda pricing needs invocation-count + GB-second CloudWatch metrics this version doesn't collect. Its GCP mapping (Cloud Run functions) and list price still show.
- **GCP prices show "N/A" even with `GCP_BILLING_API_KEY` set** — confirm the "Cloud Billing API" is enabled on that key's GCP project (APIs & Services → Library). The Cloud SQL SKU matching in `lib/pricing/gcp-billing-catalog.ts` was verified and fixed against live SKU data (Google's own catalog inconsistently formats the vCPU vs RAM SKU descriptions for the same tier — `"Zonal - Enterprise N4 vCPU"` vs `"Zonal- Enterprise N4 RAM"`, no space before the second hyphen); if Google changes the wording again it'll need a matching update.
- **AWS-side comparison pricing (EC2/RDS/S3) shows "N/A" even with AWS credentials configured** — this uses CloudShift-G's own AWS identity directly (not the tenant's assumed role, since price list data isn't tenant-scoped), and needs a separate `pricing:GetProducts` permission on that IAM user/role — it's not covered by the audit-role's read-only policy. Attach an inline policy granting `pricing:GetProducts` (resource `*`) to fix.
- **"New Migration" is disabled** — a migration plan sources its resources from the latest **successful** comparison; run one first at `/comparisons`. If a comparison exists but only found VPCs, there's nothing selectable either (VPCs aren't individually migratable).
- **A migration plan's costs all show "N/A"** — it inherited `costAvailable: false` from every one of its source comparison items (e.g. all-Lambda selections, or a comparison that ran on the dev adapter without cost data) — not a bug, the plan just has nothing priced to sum.
- **Migration plan detail page doesn't show a "Provision"/"Execute" button** — expected in this build; Terraform generation and actual execution are a later phase. A `DRAFT`/`APPROVED` plan is real and persisted, just not yet actionable beyond approval.

## Roadmap

Terraform generation + isolated execution, Jobs, Audit Log, and the real GCP/Terraform/GKE integration are built as separate vertical slices in later phases, each verified end-to-end in the browser before the next one starts.
