// Deliberately no auth gate here — step 1 of the wizard is public
// self-service registration (it creates the very first session), so this
// layout can't require one to already exist. Role/step-specific redirects
// happen in page.tsx, which does have access to the current session.
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
