import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/guard";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
