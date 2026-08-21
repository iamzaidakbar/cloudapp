import { FileClock } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { listAdminActions } from "@/lib/audit-log";
import { ADMIN_ACTION_TYPES, type AdminActionTypeValue } from "@/lib/audit-log-shared";
import type { AdminActionType } from "@/lib/generated/prisma/client";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import { AuditLogHero } from "@/components/audit-log/audit-log-hero";
import { AuditLogFilterBar } from "@/components/audit-log/audit-log-filter-bar";
import { AuditLogTable } from "@/components/audit-log/audit-log-table";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const admin = await requireTenantScope();

  const urlSearchParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const actionParam = urlSearchParams.get("action");
  const action =
    actionParam && (ADMIN_ACTION_TYPES as readonly string[]).includes(actionParam)
      ? (actionParam as AdminActionTypeValue as AdminActionType)
      : undefined;

  const { items, total } = await listAdminActions({ tenantId: admin.tenantId, skip, take, action });
  const meta = paginationMeta(page, pageSize, total);

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams(urlSearchParams);
    next.set("page", String(p));
    return `/audit-log?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <AuditLogHero totalActions={total} />
      <AuditLogFilterBar />

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState icon={FileClock} title="No activity yet" description="Admin actions will show up here as they happen." />
        }
        pagination={meta}
        buildPageHref={buildPageHref}
      >
        <AuditLogTable rows={items} />
      </DataTableShell>
    </div>
  );
}
