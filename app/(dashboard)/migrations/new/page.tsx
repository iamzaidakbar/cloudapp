import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { getSelectableComparisonItems } from "@/lib/migrations";
import { ResourceSelector } from "@/components/migrations/resource-selector";
import { EmptyState } from "@/components/empty-state";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NewMigrationPage() {
  const admin = await requireTenantScope();
  if (admin.role !== "TENANT_ADMIN") redirect("/migrations");

  const selectable = await getSelectableComparisonItems(admin.tenantId);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <section className="border border-border bg-card">
          <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
            <Link
              href="/migrations"
              className={cn(
                buttonVariants({ variant: "ghost", size: "xs" }),
                "-ml-1.5 w-fit",
              )}
            >
              <ArrowLeft className="size-3.5" />
              Migrations
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                New plan
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              New migration
            </h1>
            <p className="text-sm text-muted-foreground">
              Select resources from your latest comparison to include in this migration plan.
            </p>
          </div>
        </section>
      </FadeIn>

      {selectable && selectable.items.length > 0 ? (
        <section className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3 md:px-5">
            <h2 className="text-sm font-semibold tracking-tight">Select resources</h2>
            <p className="text-xs text-muted-foreground">
              {selectable.items.length.toLocaleString()} comparable resource
              {selectable.items.length === 1 ? "" : "s"} available
            </p>
          </div>
          <div className="p-4 md:p-5">
            <ResourceSelector items={selectable.items} />
          </div>
        </section>
      ) : (
        <EmptyState
          icon={ArrowRightLeft}
          title="No resources to select"
          description="Run a successful AWS to GCP comparison first — VPCs aren't individually migratable, so at least one EC2, S3, RDS, or Lambda resource is needed."
        />
      )}
    </div>
  );
}
