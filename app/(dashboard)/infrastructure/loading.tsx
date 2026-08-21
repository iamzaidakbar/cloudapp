import { Skeleton } from "@/components/ui/skeleton";

export default function InfrastructureLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-16 w-full border border-border" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full border border-border" />
        ))}
      </div>
      <Skeleton className="h-28 w-full border border-border" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex flex-col gap-1.5 border border-border bg-card p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
