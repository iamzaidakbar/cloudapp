// Single source of truth for the QUEUED/RUNNING/SUCCEEDED/FAILED run-status
// lifecycle that TerraformRunStatus, ApplyRunStatus, and RollbackRunStatus
// (prisma/schema.prisma) all define identically, and that the three polling
// panels (components/migrations/terraform-panel.tsx, apply-panel.tsx,
// rollback-panel.tsx) each currently hand-duplicate as their own local
// `STATUS_CLASS` map and `TERMINAL_STATUSES` set. Not yet consumed anywhere
// — this file only extracts what already exists faithfully; rewiring the
// panels/badges to import from here happens in a later stage.
//
// JobStatus / JobRowStatus (lib/jobs-shared.ts; used by
// components/jobs/job-status-badge.tsx and components/audits/audit-status-badge.tsx)
// are a superset of this lifecycle that adds a fifth value, CANCELLED, styled
// identically to QUEUED (bg-muted). RUN_STATUS_CLASS/RUN_STATUS_LABEL include
// CANCELLED for that reason, but isRunTerminal deliberately reuses the exact
// 2-value TERMINAL_STATUSES set (SUCCEEDED/FAILED only, no CANCELLED) already
// used in the three polling panels' useEffect cleanup logic — Terraform/Apply/
// Rollback runs never reach CANCELLED.
//
// Out of scope (different domains, not a run-status lifecycle):
// MigrationPlanStatus (migration-status-badge.tsx), ConnectionStatus
// (aws/connection-status-badge.tsx), VerificationStatus
// (migrations/verification-panel.tsx — HEALTHY/UNHEALTHY/UNAVAILABLE), and
// the free-text heuristic in infrastructure/resource-status-badge.tsx.

export const RUN_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"] as const;

/** Matches TerraformRunStatus / ApplyRunStatus / RollbackRunStatus exactly. */
export type RunStatus = (typeof RUN_STATUSES)[number];

/**
 * Tailwind badge color classes, verbatim from the identical `STATUS_CLASS`
 * maps duplicated in terraform-panel.tsx, apply-panel.tsx, rollback-panel.tsx,
 * job-status-badge.tsx, and audit-status-badge.tsx. `Record<string, string>`
 * (not `Record<RunStatus, string>`) so callers passing the wider
 * JobStatus/JobRowStatus (which adds CANCELLED) still get a valid lookup.
 */
export const RUN_STATUS_CLASS: Record<string, string> = {
  QUEUED: "border-border bg-muted text-muted-foreground",
  RUNNING: "border-foreground/30 bg-foreground/10 text-foreground",
  SUCCEEDED: "border-success/40 bg-success/10 text-success",
  FAILED: "border-destructive/40 bg-destructive/10 text-destructive",
  // Not part of RunStatus itself — included for JobStatus/JobRowStatus
  // callers (job-status-badge.tsx, audit-status-badge.tsx), which style it
  // the same as QUEUED.
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

/**
 * Human-readable labels, verbatim from the identical `STATUS_LABEL` maps
 * duplicated in job-status-badge.tsx and audit-status-badge.tsx. The
 * terraform/apply/rollback panels currently render `run.status` unlabelled
 * (raw "SUCCEEDED" etc.) rather than transforming it — this map is provided
 * for callers that do want the transform.
 */
export const RUN_STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

/**
 * Terminal statuses for a run — reuses the exact values already used by
 * `TERMINAL_STATUSES` in terraform-panel.tsx, apply-panel.tsx, and
 * rollback-panel.tsx to stop polling and skip re-render once a run finishes.
 */
const TERMINAL_RUN_STATUSES = new Set<RunStatus>(["SUCCEEDED", "FAILED"]);

export function isRunTerminal(status: string): boolean {
  return TERMINAL_RUN_STATUSES.has(status as RunStatus);
}
