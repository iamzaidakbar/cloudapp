import Link from "next/link";
import { Cloud, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" description="Manage your CloudShift-G environment." />

      <Link href="/settings/aws">
        <Card className="transition-colors hover:bg-muted/40">
          <CardContent className="flex items-center gap-3">
            <Cloud className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">AWS Connection</p>
              <p className="text-sm text-muted-foreground">
                View and manage the AWS account CloudShift-G audits and migrates.
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
