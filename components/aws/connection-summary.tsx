import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import type { AwsConnection } from "@/lib/generated/prisma/client";
import type { ReactNode } from "react";

function Row({
  label,
  value,
  copyValue,
  mono,
}: {
  label: string;
  value: ReactNode;
  copyValue?: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className={cn("truncate", mono && "font-mono text-xs")}>{value}</span>
        {copyValue ? <CopyButton value={copyValue} /> : null}
      </dd>
    </>
  );
}

export function ConnectionSummary({ connection }: { connection: AwsConnection }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {connection.awsAccountId ? (
          <Row label="AWS Account ID" value={connection.awsAccountId} copyValue={connection.awsAccountId} mono />
        ) : null}
        {connection.roleArn ? (
          <Row label="Role ARN" value={connection.roleArn} copyValue={connection.roleArn} mono />
        ) : null}
        <Row label="External ID" value={connection.externalId} copyValue={connection.externalId} mono />
        {connection.connectedAt ? (
          <Row label="Connected At" value={<FormattedDateTime value={connection.connectedAt} />} />
        ) : null}
        {connection.lastVerifiedAt ? (
          <Row label="Last Verified At" value={<FormattedDateTime value={connection.lastVerifiedAt} />} />
        ) : null}
      </dl>

      {connection.verificationSource === "DEV_ADAPTER" ? (
        <div className="flex flex-col gap-2">
          <div>
            <Badge variant="outline" className="border-border bg-muted text-foreground">
              Simulated (Dev Adapter)
            </Badge>
          </div>
          <Alert>
            <AlertDescription>
              This connection was verified by CloudShift-G&apos;s simulated dev adapter, not real
              AWS, because no AWS credentials are configured for this deployment. Add
              AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY and re-verify to connect for real.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
