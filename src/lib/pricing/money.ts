/**
 * Turns a dollar amount into whole cents, so totals are added up exactly instead of with rounding drift.
 * Example: toCents(1.09) → 109. Adding 109 three times gives exactly 327, while 1.09 × 3 gives 3.2700000000000005.
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/**
 * Shows an amount of cents as dollars the way shoppers read them. Every price in the UI goes through this.
 * Example: formatMoney(327) → "$3.27"; formatMoney(-150) → "-$1.50".
 */
export function formatMoney(cents: number): string {
  return usd.format(Math.round(cents) / 100);
}

/**
 * Shows a price per unit, in cents when it is under a dollar, so small differences stay readable.
 * Example: formatUnitPrice(0.0234, "fl_oz") → "2.3¢/fl oz"; formatUnitPrice(3.29, "lb") → "$3.29/lb".
 */
export function formatUnitPrice(dollarsPerUnit: number, unit: string): string {
  const label = unit.replace("_", " ");
  if (dollarsPerUnit < 1) return `${(dollarsPerUnit * 100).toFixed(1)}¢/${label}`;
  return `${usd.format(dollarsPerUnit)}/${label}`;
}
