# CloudShift-G

CloudShift-G is an AWS → GCP migration and optimization platform. The application has a single **Admin** role — there is no tenant-member or platform-operator role in this product.

This README currently documents **Section 1 — Application Foundation**: authentication, the dashboard shell, and the database layer. Later sections (Infrastructure, Audits, Comparisons, Migrations, Jobs, Audit Log, Settings, and the AWS/GCP/Terraform/GKE integration) are not built yet — the sidebar links to them exist but 404 until each section is implemented.

## Tech stack

- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS, Ubuntu / Ubuntu Mono typography
- PostgreSQL + Prisma (with the `@prisma/adapter-pg` driver adapter)
- `iron-session` for authentication (encrypted, `httpOnly` session cookie)

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
| `DATABASE_URL` | Postgres connection string (already matches `docker-compose.yml` defaults) |
| `SESSION_SECRET` | ≥32-char random string used to encrypt the session cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Credentials for the first (and, for now, only) Admin account. There is no signup flow — this account is created by the seed script. |

## Database setup

```bash
docker compose up -d          # starts local Postgres on :5432
npm run prisma:migrate        # applies migrations (prompts for a name on first run; use "init")
npm run prisma:seed           # creates/updates the Admin user from ADMIN_EMAIL/ADMIN_PASSWORD
```

`npm run prisma:studio` opens a GUI on the database if you want to inspect rows directly.

## Running locally

```bash
npm run dev
```

Open http://localhost:3000 (Next.js will pick the next free port, e.g. 3001, if 3000 is already in use) and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

## Project structure

```
app/
  login/                    Login page
  (dashboard)/              Authenticated shell: Sidebar + Header + page content
    dashboard/               The dashboard page
  api/
    auth/login, auth/logout  Session endpoints
    health, ready             Liveness / readiness (readiness pings Postgres)
    dashboard/summary        Real Prisma-backed dashboard data
components/
  layout/                   Sidebar, Header, nav items, admin menu
  auth/                     Login form
  dashboard/                Summary cards
  ui/                       shadcn/ui primitives
lib/
  auth/                     Session, password hashing, auth guards
  validation/                Zod schemas
  db.ts, env.ts             Prisma client, validated env vars
prisma/
  schema.prisma, seed.ts, migrations/
proxy.ts                    Route guard (Next.js 16's replacement for middleware.ts)
docker-compose.yml           Local Postgres
```

## API endpoints (Section 1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | Verify credentials, issue session cookie |
| POST | `/api/auth/logout` | Admin | Destroy session |
| GET | `/api/dashboard/summary` | Admin | Real admin-account count + last login |
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

1. `docker compose up -d`, then `npm run prisma:migrate` and `npm run prisma:seed`.
2. `npm run dev`, open the app in a browser — you should be redirected to `/login`.
3. Submitting the wrong password shows a real error (no navigation).
4. Logging in with the seeded Admin credentials redirects to `/dashboard`, showing the sidebar, header, and a summary card with real numbers from Postgres (visible in DevTools → Network as a call to `/api/dashboard/summary`).
5. Clicking any other sidebar item 404s (expected — not built yet) rather than bouncing back to `/login`.
6. Logout clears the session cookie and redirects to `/login`; visiting `/dashboard` afterward redirects back to `/login`.

## Troubleshooting

- **Port 5432 already in use** — stop any other local Postgres instance, or change the host port in `docker-compose.yml`.
- **"Database is not reachable" / `/api/ready` returns 503** — confirm `docker compose ps` shows the `cloudshiftg-postgres` container healthy and that `DATABASE_URL` in `.env` matches it.
- **Stale Prisma types after editing `schema.prisma`** — run `npm run prisma:generate`.
- **Port 3000 already in use** — Next.js automatically falls back to 3001; check your terminal output for the actual URL.

## Roadmap

Section 1 (this document) covers the application foundation only. Infrastructure, Audits, Comparisons, Migrations, Jobs, Audit Log, Settings, and the real AWS/GCP/Terraform/GKE integration are built as separate vertical slices in later sections, each verified end-to-end in the browser before the next one starts.
