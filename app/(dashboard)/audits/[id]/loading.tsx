import { Skeleton } from "@/components/ui/skeleton";

export default function AuditReportLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="border border-border bg-card px-4 py-3 md:px-5">
        <Skeleton className="mb-3 h-6 w-20" />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-36" />
          </div>
          <Skeleton className="h-16 w-full sm:w-80" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
