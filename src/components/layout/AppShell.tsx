import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Places every page next to the sidebar and under the top bar, with a comfortable reading width.
 * Example: <AppShell><Dashboard /></AppShell>.
 */
export function AppShell({ children }: { children: ReactNode }) {
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
