import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

type AppBrandProps = {
  href?: string;
  onNavigate?: () => void;
  className?: string;
  /** Short supporting line under the title, hero-style. */
  description?: string;
};

export function AppBrand({
  href = "/dashboard",
  onNavigate,
  className,
  description = "AWS to GCP migration",
}: AppBrandProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("block min-w-0 outline-none", className)}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-lg font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </span>
          <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Migrate
          </span>
        </div>
        {description ? (
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </Link>
  );
}
