"use client";

import { useEffect, useRef } from "react";

/** Shows a number the same way every time. Example: formatStat(32.6, { decimals: 1, suffix: "%" }) → "32.6%". */
export function formatStat(value: number, { decimals = 0, prefix = "", suffix = "" }: { decimals?: number; prefix?: string; suffix?: string } = {}): string {
  return `${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

/**
 * A number that counts up from zero the first time it scrolls into view. The final number is in the page from the
 * start (for screen readers, no JavaScript, and reduced motion); only the visible digits animate.
 * Example: <CountUp value={88} suffix="%" /> counts 0% → 88% over about 1.4 seconds.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", durationMs = 1400 }: { value: number; decimals?: number; prefix?: string; suffix?: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatStat(value, { decimals, prefix, suffix });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = formatStat(value * eased, { decimals, prefix, suffix });
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, decimals, prefix, suffix, durationMs]);

  return (
    <>
      <span ref={ref} aria-hidden className="tabular-nums">
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </>
  );
}
