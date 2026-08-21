import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center border border-border bg-card">
        <FileQuestion className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        Go to dashboard
      </Link>
    </div>
  );
}
