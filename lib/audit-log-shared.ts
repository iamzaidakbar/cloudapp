// Client-safe constants only — no server-only imports (Prisma, pg). Mirrors
// lib/jobs-shared.ts's exact reasoning: importing AdminActionType's values
// directly from a module that also touches the database would pull the
// driver into the browser bundle the moment a "use client" component (the
// filter bar) imports it — confirmed the hard way last phase.

export const ADMIN_ACTION_TYPES = [
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "LOGOUT",
  "TENANT_CREATED",
  "AWS_CONNECTION_UPDATED",
  "AWS_CONNECTION_VERIFIED",
  "AUDIT_STARTED",
  "COMPARISON_STARTED",
  "MIGRATION_PLAN_CREATED",
  "MIGRATION_APPROVED",
  "MIGRATION_CANCELLED",
  "TERRAFORM_GENERATED",
  "MIGRATION_APPLIED",
  "VERIFICATION_RUN",
  "MIGRATION_ROLLED_BACK",
  "TEAM_MEMBER_ADDED",
] as const;

export type AdminActionTypeValue = (typeof ADMIN_ACTION_TYPES)[number];

export const ADMIN_ACTION_LABEL: Record<AdminActionTypeValue, string> = {
  LOGIN_SUCCEEDED: "Login Succeeded",
  LOGIN_FAILED: "Login Failed",
  LOGOUT: "Logout",
  TENANT_CREATED: "Organization Created",
  AWS_CONNECTION_UPDATED: "AWS Connection Updated",
  AWS_CONNECTION_VERIFIED: "AWS Connection Verified",
  AUDIT_STARTED: "Audit Started",
  COMPARISON_STARTED: "Comparison Started",
  MIGRATION_PLAN_CREATED: "Migration Plan Created",
  MIGRATION_APPROVED: "Migration Approved",
  MIGRATION_CANCELLED: "Migration Cancelled",
  TERRAFORM_GENERATED: "Terraform Generated",
  MIGRATION_APPLIED: "Migration Applied",
  VERIFICATION_RUN: "Verification Run",
  MIGRATION_ROLLED_BACK: "Migration Rolled Back",
  TEAM_MEMBER_ADDED: "Team Member Added",
};
