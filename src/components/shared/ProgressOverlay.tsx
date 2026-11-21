"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

/** How long each progress step shows. Five steps make the 5-second minimum. */
export const STEP_MS = 1000;

/** Waits at least this many steps' worth of time; used together with the real work so neither is cut short. */
export const minimumWait = (steps: number) => new Promise((resolve) => setTimeout(resolve, steps * STEP_MS));

/**
 * A full-screen "working" popup that ticks through a list of steps, one a second, while the app prepares a result.
 * Each step should name work the app really does. Example: <ProgressOverlay title="Matching your list" steps={[...]} />.
 */
export function ProgressOverlay({ title, steps }: { title: string; steps: readonly string[] }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div className="w-[26rem] rounded-2xl border bg-surface p-7 shadow-sm">
        <p className="font-display text-2xl font-semibold">{title}</p>
        <ol className="mt-5 space-y-3">
          {steps.map((label, i) => (
            <li key={label} className={i > step ? "flex items-center gap-3 text-muted-foreground/60" : "flex items-center gap-3"}>
              {i < step ? (
                <Check aria-hidden className="size-4 text-savings" />
              ) : i === step ? (
                <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
              ) : (
                <span aria-hidden className="size-4 rounded-full border" />
              )}
              <span className={i === step ? "font-medium" : undefined}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
