-- Runs automatically on first container creation (postgres image convention:
-- anything in /docker-entrypoint-initdb.d/ executes once, against a fresh
-- data volume, as the bootstrap superuser).
--
-- The bootstrap role created via POSTGRES_USER is always a Postgres
-- SUPERUSER, and superusers bypass row-level security entirely regardless of
-- FORCE ROW LEVEL SECURITY. The application must never connect as that role
-- at runtime, or every RLS policy in the schema becomes a silent no-op.
-- This creates a separate, unprivileged role for the app's own connection.
CREATE ROLE cloudshiftg_app WITH LOGIN PASSWORD 'cloudshiftg_app';

GRANT CONNECT ON DATABASE cloudshiftg TO cloudshiftg_app;
GRANT USAGE ON SCHEMA public TO cloudshiftg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cloudshiftg_app;

-- Every future table Prisma migrations create (as the cloudshiftg superuser)
-- automatically grants cloudshiftg_app the same CRUD access, so later phases
-- don't need to remember to grant privileges on each new tenant-owned table.
ALTER DEFAULT PRIVILEGES FOR ROLE cloudshiftg IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cloudshiftg_app;
