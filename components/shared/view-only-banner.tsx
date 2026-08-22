import { Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type ViewOnlyBannerProps = {
  className?: string;
  /** Override default copy when the page needs a more specific hint. */
  message?: string;
};

export function ViewOnlyBanner({
  className,
  message = "View only · Tenant Admins can make changes.",
}: ViewOnlyBannerProps) {
  return (
    <Alert className={cn(className)}>
      <Eye />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
