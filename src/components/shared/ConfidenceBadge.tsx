import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import type { MatchLabel } from "@/lib/matching/core";
import { cn } from "@/lib/utils";

const STYLES: Record<MatchLabel, { icon: typeof CircleCheck; className: string }> = {
  "Same product": { icon: CircleCheck, className: "bg-savings-soft text-savings" },
  Similar: { icon: CircleHelp, className: "bg-secondary text-foreground" },
  "No match": { icon: CircleX, className: "bg-muted text-muted-foreground" },
};

/**
 * A small pill showing how sure the app is about a list match, with an icon and the words (never color alone).
 * Example: <ConfidenceBadge label="Similar" /> tells the shopper to double-check the product.
 */
export function ConfidenceBadge({ label, className }: { label: MatchLabel; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[label];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tone, className)}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
