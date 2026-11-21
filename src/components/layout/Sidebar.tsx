"use client";

import { Leaf } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config/app";
import { cn } from "@/lib/utils";
import { signOutDemo } from "@/lib/auth/demo";
import { activeNavItem, NAV_ITEMS } from "./nav";

/** Clears this browser's session (sign-in, list, receipt, store picks) so the walkthrough can start over from the home page. */
function resetDemo() {
  try {
    for (const key of ["grocerysave:list", "grocerysave:selectedStores", "reroute:receipt-uploaded"]) localStorage.removeItem(key);
    sessionStorage.removeItem("reroute:receipt-note");
  } catch {
    // Storage blocked: nothing saved to clear.
  }
  signOutDemo();
}

/**
 * The left sidebar: the app name, the links to every page (with the current page highlighted),
 * Clicking the logo goes back to the home page and starts over. Example: on /deals, "Deal Watch" is highlighted.
 */
export function Sidebar() {
  const active = activeNavItem(usePathname());
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6">
      <Link href="/" onClick={resetDemo} className="flex items-center gap-2 px-2" title="Back to the home page (starts over)">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Leaf aria-hidden className="size-4" />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight">{APP_NAME}</span>
      </Link>

      <nav aria-label="Main" className="mt-8 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item === active;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon aria-hidden className={cn("size-4", isActive && "text-primary")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
}
