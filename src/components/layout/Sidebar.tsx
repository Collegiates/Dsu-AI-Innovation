"use client";

import { Leaf, MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, COMMUTE } from "@/lib/config/app";
import { cn } from "@/lib/utils";
import { activeNavItem, NAV_ITEMS } from "./nav";

/**
 * The left sidebar: the app name, the links to every page (with the current page highlighted),
 * and a short summary of the commute the app plans around. Example: on /deals, "Deal Watch" is highlighted.
 */
export function Sidebar() {
  const active = activeNavItem(usePathname());
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6">
      <Link href="/" className="flex items-center gap-2 px-2">
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

      <div className="rounded-lg border border-sidebar-border bg-surface p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your commute</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
          <MapPin aria-hidden className="size-3.5 text-primary" />
          {COMMUTE.from} → {COMMUTE.to}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Stores are compared by the extra drive they add.</p>
      </div>
    </aside>
  );
}
