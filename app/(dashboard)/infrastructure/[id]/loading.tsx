import { Skeleton } from "@/components/ui/skeleton";

export default function ResourceDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-44 w-full border border-border" />
      <div className="border border-border bg-card">
        <div className="flex gap-2 border-b border-border p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <div className="p-5">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
