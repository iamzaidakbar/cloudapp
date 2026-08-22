"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects an inline <script> to avoid a theme flash. React 19 /
// Next 16 warn that script tags inside components are never executed on the
// client — a false positive here (the script runs during SSR). Suppress that
// specific console error so the Next.js overlay does not block the UI.
// See: https://github.com/pacocoursey/next-themes/issues/385
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("Encountered a script tag")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      // Client re-renders: avoid React treating the inline FOUC helper as an
      // executable script tag (SSR still emits the real blocking script once).
      scriptProps={
        typeof window === "undefined"
          ? undefined
          : { type: "application/json" }
      }
    >
      {children}
    </NextThemesProvider>
  );
}
