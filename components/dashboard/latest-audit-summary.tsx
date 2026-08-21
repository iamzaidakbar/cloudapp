import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { formatCurrency } from "@/lib/format";
import type { SerializedAuditRun } from "@/lib/audits";
import { FadeIn } from "@/components/motion/fade-in";

export function LatestAuditSummary({ auditRun }: { auditRun: SerializedAuditRun }) {
  return (
    <FadeIn delayMs={40}>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              Latest Audit — #{auditRun.version}
              <AuditStatusBadge status={auditRun.status} />
            </CardTitle>
            <Link href={`/audits/${auditRun.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              View report
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Resources</p>
              <p className="text-lg font-semibold">{auditRun.resourceCount ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Findings</p>
              <p className="text-lg font-semibold">{auditRun.findingCount ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className={`text-lg font-semibold ${auditRun.criticalFindingCount ? "text-destructive" : ""}`}>
                {auditRun.criticalFindingCount ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Cost</p>
              <p className="text-lg font-semibold">
                {auditRun.costDataAvailable && auditRun.estimatedMonthlyCost !== null
                  ? formatCurrency(auditRun.estimatedMonthlyCost)
                  : "N/A"}
              </p>
            </div>
          </div>
          {auditRun.finishedAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Completed <FormattedDateTime value={auditRun.finishedAt} />
            </p>
          ) : null}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
