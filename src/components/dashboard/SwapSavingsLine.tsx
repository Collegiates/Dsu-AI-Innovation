"use client";

import { Money } from "@/components/shared/Money";
import { usePreference } from "@/lib/preferences/usePreference";
import { weeklyToMonthlyCents } from "@/lib/pricing/monthly";

/**
 * The Dashboard's "Swaps save you $X a week · $Y a month" line, counting only swaps at or above the shopper's
 * savings threshold (set in Settings or on the Trip Plan). The swap savings themselves are computed by code on the server.
 * Example: savings [47, 37, 29] with a $0.30 threshold → "$0.84 a week · $3.64 a month".
 */
export function SwapSavingsLine({ weeklySavingsCents }: { weeklySavingsCents: number[] }) {
  const { value: minSavingsCents } = usePreference("minSavingsCents");
  const kept = weeklySavingsCents.filter((c) => c >= minSavingsCents);
  const weekly = kept.reduce((sum, c) => sum + c, 0);
  if (weekly <= 0) return <p className="mt-2 text-sm text-muted-foreground">No swaps at or above your savings threshold.</p>;
  return (
    <p className="mt-3 font-display text-2xl font-semibold">
      {kept.length} swap{kept.length === 1 ? "" : "s"} save you <Money cents={weekly} className="text-savings" /> a week ·{" "}
      <Money cents={weeklyToMonthlyCents(weekly)} className="text-savings" /> a month
    </p>
  );
}
