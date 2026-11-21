import { ArrowLeftRight, LayoutDashboard, ListChecks, Route, Settings, ShieldAlert, Tag, type LucideIcon } from "lucide-react";

/** One link in the sidebar: where it goes, its name, and its icon. */
export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The app's pages, in sidebar order. Each page title in the top bar comes from here. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/plan", label: "Dashboard", icon: LayoutDashboard },
  { href: "/list", label: "My List", icon: ListChecks },
  { href: "/trip", label: "Trip Plan", icon: Route },
  { href: "/swaps", label: "Smart Swaps", icon: ArrowLeftRight },
  { href: "/deals", label: "Deal Watch", icon: Tag },
  { href: "/recalls", label: "Recalls & Safety", icon: ShieldAlert },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Finds the nav item for the current address, so the sidebar can highlight it and the top bar can show its title.
 * Example: "/trip" → Trip Plan; "/plan" → Dashboard; "/" (the landing page) → none.
 */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
