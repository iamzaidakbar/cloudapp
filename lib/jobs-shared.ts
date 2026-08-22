// Client-safe constants/types only — no server-only imports (Prisma, pg).
// lib/jobs.ts (server-only: real DB queries) and any "use client" component
// (e.g. components/jobs/jobs-filter-bar.tsx) both import from here so that
// importing the filter bar never pulls the database driver into the browser
// bundle — confirmed the hard way: `npm run build` failed with "Module not
// found: Can't resolve 'util/types'" (pg's Node-only internals) once the
// filter bar imported these directly from lib/jobs.ts.

export const JOB_TYPES = [
  "AUDIT",
  "COMPARISON",
  "TERRAFORM",
  "APPLY",
  "VERIFICATION",
  "DATA_TRANSFER",
  "ROLLBACK",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type JobRowStatus = (typeof JOB_STATUSES)[number];

export type JobRow = {
  id: string;
  type: JobType;
  version: number;
  status: JobRowStatus;
  timestamp: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  migrationPlanId: string | null;
  migrationPlanSequenceNumber: number | null;
};
