"use client";

import { usePreference } from "@/lib/preferences/usePreference";

/** The choices for the smallest saving worth a recommendation, in cents per week. */
export const THRESHOLD_OPTIONS = [0, 25, 30, 40, 50, 100] as const;

const label = (cents: number) => (cents === 0 ? "Any saving" : `$${(cents / 100).toFixed(2)}+ a week`);

/**
 * A small picker for "only recommend a swap if it saves at least $X a week". Saved in the browser and used by the
 * Trip Plan, the Overview and Smart Swaps, so a stricter threshold hides smaller swaps everywhere.
 * Example: choosing "$0.40+ a week" keeps the $0.47 milk swap and hides the $0.37 coffee and $0.29 yogurt swaps.
 */
export function SavingsThreshold({ id = "savings-threshold" }: { id?: string }) {
  const { value, ready, save } = usePreference("minSavingsCents");
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Recommend swaps that save</span>
      <select
        id={id}
        value={value}
        disabled={!ready}
        onChange={(e) => save(Number(e.target.value))}
        className="rounded-md border bg-surface px-2.5 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
      >
        {THRESHOLD_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {label(c)}
          </option>
        ))}
      </select>
    </label>
  );
}
