import { ListChecks } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { EmptyState } from "@/components/empty-state";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your CloudShift-G environment.
        </p>
      </div>

      <SummaryCards />

      <EmptyState
        icon={ListChecks}
        title="No activity yet"
        description="Connect an AWS account and run your first audit to see infrastructure, cost, and migration activity here."
      />
    </div>
  );
}
