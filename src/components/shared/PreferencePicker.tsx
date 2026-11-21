"use client";

import { Gauge, PiggyBank, Scale } from "lucide-react";
import { assumptions, type TripPreference } from "@/lib/config/app";
import { cn } from "@/lib/utils";

/** The three trip preferences, in the order shown, with the words the shopper sees. */
export const PREFERENCE_OPTIONS: { value: TripPreference; label: string; icon: typeof Gauge }[] = [
  { value: "fastest", label: "Get home fastest", icon: Gauge },
  { value: "balanced", label: "Balance", icon: Scale },
  { value: "maxSavings", label: "Maximize savings", icon: PiggyBank },
];

/**
 * A three-way switch for how the trip planner weighs time against money. It is built from real radio buttons,
 * so arrow keys and screen readers work as expected. Each option says what a minute of the shopper's time is worth.
 * Example: choosing "Maximize savings" values time at $0.00/min, so any detour that saves money is taken.
 */
export function PreferencePicker({ value, onChange, name = "trip-preference" }: { value: TripPreference; onChange: (v: TripPreference) => void; name?: string }) {
  return (
    <fieldset className="inline-flex rounded-xl border bg-surface p-1">
      <legend className="sr-only">Trip preference</legend>
      {PREFERENCE_OPTIONS.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            title={`Your time counted at $${assumptions.timeValuePerMinute[option.value].toFixed(2)} per minute`}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
              checked ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="sr-only" />
            <option.icon aria-hidden className="size-4" />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
