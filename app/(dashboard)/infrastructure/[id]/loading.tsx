import { Skeleton } from "@/components/ui/skeleton";

export default function ResourceDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
