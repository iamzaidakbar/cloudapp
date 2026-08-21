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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Metadata</h2>
        <p className="text-xs text-muted-foreground">
          Collected by{" "}
          <Link
            href={`/audits/${auditRunId}`}
            className="text-foreground underline-offset-4 hover:underline"
          >
            audit run #{auditRunVersion}
          </Link>{" "}
          on <FormattedDateTime value={collectedAt} />.
        </p>
      </div>
      <pre className="max-h-[28rem] overflow-auto border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
        {JSON.stringify(rawConfig, null, 2)}
      </pre>
    </div>
  );
}
