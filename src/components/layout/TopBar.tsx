"use client";

import { usePathname } from "next/navigation";
import { activeNavItem } from "./nav";

/**
 * The slim bar above each page, showing the page's name.
 * Example: on /trip it reads "Trip Plan".
 */
export function TopBar() {
  const title = activeNavItem(usePathname())?.label ?? "";
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background/90 px-10 backdrop-blur">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
    </header>
  );
}
