# CloudShift-G

CloudShift-G is an AWS → GCP migration and optimization platform. The application has a single **Admin** role — there is no tenant-member or platform-operator role in this product. "Tenant" in the data model refers to the organizational/AWS-account boundary, not a UI role.

This README covers what's built so far: the **application foundation** (authentication, dashboard shell) and **tenant onboarding + AWS connection management**. Later sections (Infrastructure, Audits, Comparisons, Migrations, Jobs, Audit Log, and the GCP/Terraform/GKE integration) are not built yet — their sidebar links exist but 404 until each is implemented.

## Tech stack

- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS, Ubuntu / Ubuntu Mono typography, dark mode
- PostgreSQL + Prisma (`@prisma/adapter-pg` driver adapter) with row-level security for tenant isolation
- `iron-session` for authentication (encrypted, `httpOnly` session cookie)
- `@aws-sdk/client-sts` for real cross-account AWS role verification, with a clearly-labeled simulated dev adapter for local testing without an AWS account

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
    dashboard/               Dashboard page (shows a connect-AWS CTA until onboarding completes)
    settings/                Settings index + AWS Connection management page
  api/
    auth/login, auth/logout  Session endpoints
    onboarding/tenant        Creates the (one) Tenant + its AwsConnection stub
    aws/connection           Read connection state / update the role ARN
    aws/connection/verify    Runs real-or-simulated STS verification
    health, ready             Liveness / readiness (readiness pings Postgres)
    dashboard/summary        Real Prisma-backed dashboard data
components/
  layout/                   Sidebar, Header, nav items, admin menu
  onboarding/               Wizard steps
  settings/                 AWS connection panel
  aws/                      Shared connection status badge + detail summary
  dashboard/                Summary cards, onboarding CTA
  auth/                     Login form
  ui/                       shadcn/ui primitives
lib/
  auth/                     Session, password hashing, auth guards
  aws/                      STS integration, dev adapter, verification orchestrator
  db/with-tenant.ts         Row-level-security session context helper
  tenant.ts                 Shared tenant + connection resolver
  validation/               Zod schemas
  db.ts, env.ts             Prisma client, validated env vars
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

## Troubleshooting

- **Port 5432 already in use** — stop any other local Postgres instance, or change the host port in `docker-compose.yml`.
- **"Database is not reachable" / `/api/ready` returns 503** — confirm `docker compose ps` shows the `cloudshiftg-postgres` container healthy and that `APP_DATABASE_URL` in `.env` matches it.
- **Stale Prisma types/client after editing `schema.prisma`** — run `npm run prisma:generate`, then **restart the dev server** (not just save-and-hot-reload) — the Prisma client is cached as a module-level singleton across hot reloads and won't pick up new models otherwise.
- **RLS seems to do nothing** — check the role the app actually connects as (`APP_DATABASE_URL`) is not a Postgres superuser and doesn't have `BYPASSRLS`; run `\du` in `psql` to check role attributes.
- **Port 3000 already in use** — Next.js automatically falls back to 3001; check your terminal output for the actual URL.

## Roadmap

Infrastructure, Audits, Comparisons, Migrations, Jobs, Audit Log, and the real GCP/Terraform/GKE integration are built as separate vertical slices in later phases, each verified end-to-end in the browser before the next one starts.
