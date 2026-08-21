import Link from "next/link";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";

type ResourceMetadataTabProps = {
  rawConfig: unknown;
  auditRunId: string;
  auditRunVersion: number;
  collectedAt: string | Date;
};

export function ResourceMetadataTab({
  rawConfig,
  auditRunId,
  auditRunVersion,
  collectedAt,
}: ResourceMetadataTabProps) {
  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-sm text-muted-foreground">
        Collected by{" "}
        <Link href={`/audits/${auditRunId}`} className="text-foreground hover:underline">
          audit run #{auditRunVersion}
        </Link>{" "}
        on <FormattedDateTime value={collectedAt} />.
      </p>
      <pre className="max-h-96 overflow-auto rounded-none border border-border bg-muted/40 p-3 font-mono text-xs">
        {JSON.stringify(rawConfig, null, 2)}
      </pre>
    </div>
  );
}
