import { Building2, Link2, Users } from "lucide-react";
import type { ComponentType } from "react";
import { listTenantsForOperator } from "@/lib/platform";
import { ConnectionStatusBadge } from "@/components/aws/connection-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerItem } from "@/components/motion/stagger-list";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function KpiTile({
  index,
  label,
  value,
  hint,
  icon: Icon,
}: {
  index: number;
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <StaggerItem index={index} className="h-full">
      <div className="group flex h-full flex-col justify-between border border-border bg-card p-3.5 transition-colors hover:bg-muted/40">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <div className="mt-3 flex flex-col gap-0.5">
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </StaggerItem>
  );
}

export default async function PlatformPage() {
  const tenants = await listTenantsForOperator();
  const connected = tenants.filter((t) => t.awsConnection?.status === "CONNECTED").length;
  const totalAdmins = tenants.reduce((sum, t) => sum + t._count.admins, 0);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <section className="border border-border bg-card">
          <div className="flex flex-col gap-1.5 px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Tenants</h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Platform
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Every organization on this platform. AWS role ARNs and external IDs are never shown here —
              the Platform Operator has no access to tenant cloud credentials.
            </p>
          </div>
        </section>
      </FadeIn>

      {tenants.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <KpiTile
            index={0}
            label="Organizations"
            value={tenants.length.toLocaleString()}
            hint="Registered tenants"
            icon={Building2}
          />
          <KpiTile
            index={1}
            label="Connected"
            value={String(connected)}
            hint="AWS connection verified"
            icon={Link2}
          />
          <KpiTile
            index={2}
            label="Admins"
            value={totalAdmins.toLocaleString()}
            hint="Across all tenants"
            icon={Users}
          />
        </div>
      ) : null}

      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants yet"
          description="Organizations will appear here once they register."
        />
      ) : (
        <FadeIn delayMs={40}>
          <section className="border border-border bg-card">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-sm font-semibold tracking-tight">Organizations</h2>
                <p className="text-xs text-muted-foreground">
                  {tenants.length.toLocaleString()} tenant{tenants.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>AWS Connection</TableHead>
                    <TableHead>AWS Account</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>
                        {tenant.awsConnection ? (
                          <ConnectionStatusBadge status={tenant.awsConnection.status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tenant.awsConnection?.awsAccountId ?? "—"}
                      </TableCell>
                      <TableCell>{tenant._count.admins}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <FormattedDateTime value={tenant.createdAt} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </FadeIn>
      )}
    </div>
  );
}
