import { Building2 } from "lucide-react";
import { listTenantsForOperator } from "@/lib/platform";
import { ConnectionStatusBadge } from "@/components/aws/connection-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PlatformPage() {
  const tenants = await listTenantsForOperator();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Every organization on this platform. AWS role ARNs and external IDs are never shown here — the
          Platform Operator has no access to tenant cloud credentials.
        </p>
      </div>

      {tenants.length === 0 ? (
        <EmptyState icon={Building2} title="No tenants yet" description="Organizations will appear here once they register." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
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
      )}
    </div>
  );
}
