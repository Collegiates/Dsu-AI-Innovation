"use client";

import { Gauge, PiggyBank, Scale } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { assumptions, type TripPreference } from "@/lib/config/app";
import { cn } from "@/lib/utils";

/** The three trip preferences, in the order shown, with the words the shopper sees. */
export const PREFERENCE_OPTIONS: { value: TripPreference; label: string; icon: typeof Gauge }[] = [
  { value: "fastest", label: "Fewest stops", icon: Gauge },
  { value: "balanced", label: "Balance", icon: Scale },
  { value: "maxSavings", label: "Maximize savings", icon: PiggyBank },
];

/**
 * A three-way switch for how the trip planner weighs time against money. It is built from real radio buttons,
 * so arrow keys and screen readers work as expected. Each option says what a minute of the shopper's time is worth.
 * Example: choosing "Maximize savings" values time at $0.00/min, so any extra store that saves money is added.
 * One green pill slides to the chosen option, so the switch shows where the choice moved.
 */
export function PreferencePicker({ value, onChange, name = "trip-preference" }: { value: TripPreference; onChange: (v: TripPreference) => void; name?: string }) {
  const { containerRef, box, animate } = useSlidingThumb(value);
  return (
    <fieldset ref={containerRef} className="relative inline-flex rounded-xl border bg-surface p-1">
      <legend className="sr-only">Trip preference</legend>
      {box ? (
        <span
          aria-hidden
          className={cn(
            "motion-travel pointer-events-none absolute top-1 bottom-1 left-0 rounded-lg bg-primary shadow-sm",
            animate && "transition-[translate,width] duration-(--dur-state) ease-(--ease-settle)",
          )}
          style={{ translate: `${box.left}px 0`, width: box.width }}
        />
      ) : null}
      {PREFERENCE_OPTIONS.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            data-value={option.value}
            title={`Your time counted at $${assumptions.timeValuePerMinute[option.value].toFixed(2)} per minute`}
            className={cn(
              // Only the text color fades: a fading hover background would paint over the arriving pill.
              "motion-swap relative flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-[color] duration-(--dur-feedback) has-focus-visible:outline-2 has-focus-visible:outline-ring",
              checked ? "text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              // Before the pill has been measured (first paint, or no script), the chosen option draws its own background.
              checked && !box && "bg-primary shadow-sm",
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

/**
 * Measures where the chosen option sits so one pill can slide to it. The first position is set without animation,
 * and the pill re-measures when the switch changes size (for example once the web font loads).
 */
function useSlidingThumb(value: TripPreference) {
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const label = container.querySelector<HTMLElement>(`label[data-value="${value}"]`);
      if (label) setBox({ left: label.offsetLeft, width: label.offsetWidth });
    };
    measure();
    // Without ResizeObserver (older browsers, test environments) the pill is still placed; it just won't re-measure on resize.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value]);

  // Turn sliding on only after the pill has been placed once, so it never flies in from the left edge.
  useLayoutEffect(() => {
    if (box && !animate) {
      const frame = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [box, animate]);

  return { containerRef, box, animate };
}
