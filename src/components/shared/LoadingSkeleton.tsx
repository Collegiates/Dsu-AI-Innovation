import { cn } from "@/lib/utils";

/**
 * A soft placeholder block shown while data loads, so the page doesn't jump when content arrives.
 * Example: <LoadingSkeleton className="h-40" /> reserves space for a card.
 */
export function LoadingSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}
