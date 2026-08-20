import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceOverviewTab } from "@/components/infrastructure/resource-overview-tab";
import { ResourceMetricsCostTab } from "@/components/infrastructure/resource-metrics-cost-tab";
import { ResourceFindingsTab } from "@/components/infrastructure/resource-findings-tab";
import { ResourceMetadataTab } from "@/components/infrastructure/resource-metadata-tab";
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
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="metrics">Metrics & Cost</TabsTrigger>
        <TabsTrigger value="findings">
          Findings{findings.length > 0 ? ` (${findings.length})` : ""}
        </TabsTrigger>
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ResourceOverviewTab tags={tags} />
      </TabsContent>
      <TabsContent value="metrics">
        <ResourceMetricsCostTab
          monthlyCost={monthlyCost}
          costAvailable={costAvailable}
          cpuUtilizationAvgPercent={cpuUtilizationAvgPercent}
        />
      </TabsContent>
      <TabsContent value="findings">
        <ResourceFindingsTab findings={findings} />
      </TabsContent>
      <TabsContent value="metadata">
        <ResourceMetadataTab
          rawConfig={rawConfig}
          auditRunId={auditRunId}
          auditRunVersion={auditRunVersion}
          collectedAt={collectedAt}
        />
      </TabsContent>
    </Tabs>
  );
}
