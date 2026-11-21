"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

// Public pages that have their own full-width layout, without the app's sidebar and top bar.
const PUBLIC_PATHS = new Set(["/", "/login"]);

/**
 * Places every app page next to the sidebar and under the top bar, with a comfortable reading width.
 * The landing page and the login page are shown on their own, without the app frame.
 * Example: <AppShell><TripPlan /></AppShell>.
 */
export function AppShell({ children }: { children: ReactNode }) {
  if (PUBLIC_PATHS.has(usePathname())) return <>{children}</>;
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
