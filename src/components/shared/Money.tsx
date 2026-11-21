import { formatMoney } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

/**
 * Shows an amount of money, always formatted by the shared money helper, with numbers that line up in columns.
 * Example: <Money cents={327} /> shows "$3.27"; <Money cents={-150} signed /> shows "−$1.50".
 */
export function Money({ cents, className, signed = false }: { cents: number; className?: string; signed?: boolean }) {
  const text = formatMoney(Math.abs(cents));
  const sign = signed ? (cents > 0 ? "+" : cents < 0 ? "−" : "") : cents < 0 ? "−" : "";
  return <span className={cn("tabular-nums", className)}>{`${sign}${text}`}</span>;
}
