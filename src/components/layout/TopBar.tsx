"use client";

import { Route } from "lucide-react";
import { usePathname } from "next/navigation";
import { COMMUTE } from "@/lib/config/app";
import { activeNavItem } from "./nav";

/**
 * The slim bar above each page: the page's name on the left and the commute selector on the right.
 * There is one commute for now, so the selector shows it without pretending there are others.
 */
export function TopBar() {
  const title = activeNavItem(usePathname())?.label ?? "";
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/90 px-10 backdrop-blur">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <label className="flex items-center gap-2 text-sm">
        <Route aria-hidden className="size-4 text-primary" />
        <span className="sr-only">Commute</span>
        <select
          className="rounded-md border bg-surface px-2.5 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
          defaultValue={COMMUTE.id}
        >
          <option value={COMMUTE.id}>{COMMUTE.label}</option>
        </select>
      </label>
    </header>
  );
}
