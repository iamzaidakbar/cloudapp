import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-40 w-full border border-border" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full border border-border" />
        ))}
      </div>
      <Skeleton className="h-36 w-full border border-border" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Skeleton className="h-64 w-full border border-border lg:col-span-3" />
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Skeleton className="h-40 w-full border border-border" />
          <Skeleton className="h-32 w-full border border-border" />
        </div>
      </div>
      <Skeleton className="h-48 w-full border border-border" />
    </div>
  );
}
