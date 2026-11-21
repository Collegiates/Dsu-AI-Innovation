import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A small labeled number, such as "Groceries: $41.20". The value is passed in already formatted.
 * Example: <StatCard label="Groceries" value={<Money cents={4120} />} hint="at ALDI" />.
 */
export function StatCard({ label, value, hint, className }: { label: string; value: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-surface px-4 py-3", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
