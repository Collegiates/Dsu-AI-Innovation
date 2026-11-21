import { Info } from "lucide-react";
import { DATA_SOURCE_NOTE } from "@/lib/config/app";
import { cn } from "@/lib/utils";

/**
 * The small honesty line saying where prices came from, shown next to any prices.
 * Example: "Online prices from aldi.us and walmart.com, viewed Nov 21, 2026. In-store prices may differ."
 */
export function DataSourceNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Info aria-hidden className="size-3.5 shrink-0" />
      {DATA_SOURCE_NOTE}
    </p>
  );
}
