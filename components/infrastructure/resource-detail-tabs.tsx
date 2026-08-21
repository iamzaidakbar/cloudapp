import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceOverviewTab } from "@/components/infrastructure/resource-overview-tab";
import { ResourceMetricsCostTab } from "@/components/infrastructure/resource-metrics-cost-tab";
import { ResourceFindingsTab } from "@/components/infrastructure/resource-findings-tab";
import { ResourceMetadataTab } from "@/components/infrastructure/resource-metadata-tab";
import { FadeIn } from "@/components/motion/fade-in";
import type { FindingRow } from "@/components/findings/findings-table";

type ResourceDetailTabsProps = {
  tags: Record<string, string>;
  monthlyCost: string | number | null;
  costAvailable: boolean;
  cpuUtilizationAvgPercent: number | null;
  findings: FindingRow[];
  rawConfig: unknown;
  auditRunId: string;
  auditRunVersion: number;
  collectedAt: string | Date;
};

export function ResourceDetailTabs({
  tags,
  monthlyCost,
  costAvailable,
  cpuUtilizationAvgPercent,
  findings,
  rawConfig,
  auditRunId,
  auditRunVersion,
  collectedAt,
}: ResourceDetailTabsProps) {
  return (
    <FadeIn delayMs={40}>
      <Tabs defaultValue="overview" className="gap-0 border border-border bg-card">
        <div className="border-b border-border px-2 pt-2">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics & Cost</TabsTrigger>
            <TabsTrigger value="findings">
              Findings
              {findings.length > 0 ? (
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                  {findings.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="p-4 md:p-5">
          <ResourceOverviewTab tags={tags} />
        </TabsContent>
        <TabsContent value="metrics" className="p-4 md:p-5">
          <ResourceMetricsCostTab
            monthlyCost={monthlyCost}
            costAvailable={costAvailable}
            cpuUtilizationAvgPercent={cpuUtilizationAvgPercent}
          />
        </TabsContent>
        <TabsContent value="findings" className="p-4 md:p-5">
          <ResourceFindingsTab findings={findings} />
        </TabsContent>
        <TabsContent value="metadata" className="p-4 md:p-5">
          <ResourceMetadataTab
            rawConfig={rawConfig}
            auditRunId={auditRunId}
            auditRunVersion={auditRunVersion}
            collectedAt={collectedAt}
          />
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
