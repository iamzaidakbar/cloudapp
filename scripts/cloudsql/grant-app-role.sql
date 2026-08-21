-- Run after `prisma migrate deploy` as the cloudshiftg (migrate) role.
-- Cloud SQL does not run db/init/*.sql; grants must be applied explicitly.

GRANT CONNECT ON DATABASE cloudshiftg TO cloudshiftg_app;
GRANT USAGE ON SCHEMA public TO cloudshiftg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cloudshiftg_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cloudshiftg_app;

ALTER DEFAULT PRIVILEGES FOR ROLE cloudshiftg IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cloudshiftg_app;
ALTER DEFAULT PRIVILEGES FOR ROLE cloudshiftg IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cloudshiftg_app;
