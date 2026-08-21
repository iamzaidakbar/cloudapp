import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type DataTableShellProps = {
  isEmpty: boolean;
  emptyState: ReactNode;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  buildPageHref: (page: number) => string;
  children: ReactNode;
};

export function DataTableShell({ isEmpty, emptyState, pagination, buildPageHref, children }: DataTableShellProps) {
  if (isEmpty) return <>{emptyState}</>;

  const { page, totalPages, total } = pagination;
  const start = (page - 1) * pagination.pageSize + 1;
  const end = Math.min(page * pagination.pageSize, total);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg bg-glass-strong supports-backdrop-filter:bg-glass supports-backdrop-filter:backdrop-blur-md ring-1 ring-glass-border shadow-glass">
        {children}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {start}–{end} of {total}
        </p>
        <div className="flex items-center gap-2">
          <p>
            Page {page} of {totalPages}
          </p>
          {page > 1 ? (
            <Link href={buildPageHref(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}>
              <ChevronLeft className="size-3.5" />
            </Link>
          ) : (
            <Button variant="outline" size="icon-sm" disabled>
              <ChevronLeft className="size-3.5" />
            </Button>
          )}
          {page < totalPages ? (
            <Link href={buildPageHref(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}>
              <ChevronRight className="size-3.5" />
            </Link>
          ) : (
            <Button variant="outline" size="icon-sm" disabled>
              <ChevronRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
