import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import {
  ADMIN_ACTION_LABEL,
  type AdminActionTypeValue,
} from "@/lib/audit-log-shared";

const ACTION_TONE: Record<AdminActionTypeValue, StatusTone> = {
  LOGIN_SUCCEEDED: "active",
  LOGIN_FAILED: "danger",
  LOGOUT: "neutral",
  TENANT_CREATED: "active",
  AWS_CONNECTION_UPDATED: "active",
  AWS_CONNECTION_VERIFIED: "success",
  AUDIT_STARTED: "active",
  COMPARISON_STARTED: "active",
  MIGRATION_PLAN_CREATED: "active",
  MIGRATION_APPROVED: "success",
  MIGRATION_CANCELLED: "neutral",
  TERRAFORM_GENERATED: "active",
  MIGRATION_APPLIED: "warning",
  VERIFICATION_RUN: "active",
  MIGRATION_ROLLED_BACK: "danger",
  TEAM_MEMBER_ADDED: "active",
};

export function ActionBadge({ action }: { action: AdminActionTypeValue }) {
  return (
    <StatusBadge tone={ACTION_TONE[action]}>
      {ADMIN_ACTION_LABEL[action]}
    </StatusBadge>
  );
}
