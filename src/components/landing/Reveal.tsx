"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./landing.css";

/**
 * Fades and slides its content in the first time it scrolls into view. The content is visible by default and is only
 * hidden once JavaScript confirms it is below the fold, so nothing is lost without JavaScript or with reduced motion.
 * Example: <Reveal delay={0.1}><StepCard /></Reveal> appears a tenth of a second after the card before it.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen when the page opens: leave it alone rather than make it blink.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("landing-reveal", className)} style={{ "--delay": `${delay}s` } as React.CSSProperties}>
      {children}
    </div>
  );
}
