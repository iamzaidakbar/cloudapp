import Link from "next/link";
import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

type AppBrandProps = {
  href?: string;
  onNavigate?: () => void;
  className?: string;
};

export function AppBrand({
  href = "/dashboard",
  onNavigate,
  className,
}: AppBrandProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-w-0 items-center gap-2.5 text-foreground outline-none",
        className,
      )}
    >
      <Cloud className="size-5 shrink-0" strokeWidth={1.75} />
      <span className="truncate text-[15px] font-semibold tracking-tight">
        {APP_NAME}
      </span>
    </Link>
  );
}
