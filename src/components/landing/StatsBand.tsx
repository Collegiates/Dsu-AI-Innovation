import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

/**
 * The numbers band: why grocery costs matter and why multi-store shopping is normal. The first two figures are
 * published statistics (sources underneath); the third is an illustrative estimate for the demo shopper, and says so.
 */
export const STATS = [
  { value: 32.6, decimals: 1, suffix: "%", label: "of income goes to food in the lowest-income households" },
  { value: 88, suffix: "%", label: "of grocery shoppers visit more than one store a month" },
  { value: 219, prefix: "$", label: "a year James saves with swaps" },
] as const;

export function StatsBand() {
  return (
    <section aria-labelledby="stats-title" className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-10 py-20">
        <h2 id="stats-title" className="sr-only">
          By the numbers
        </h2>
        <dl className="grid grid-cols-3 gap-10">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.1}>
              <div className="border-l border-primary-foreground/25 pl-6">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <p className="font-display text-6xl font-semibold tracking-tight">
                    <CountUp value={stat.value} decimals={"decimals" in stat ? stat.decimals : 0} prefix={"prefix" in stat ? stat.prefix : ""} suffix={"suffix" in stat ? stat.suffix : ""} />
                  </p>
                  <p aria-hidden className="mt-3 max-w-60 text-lg text-primary-foreground/90">
                    {stat.label}
                  </p>
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
        <p className="mt-12 max-w-4xl text-xs leading-5 text-primary-foreground/85">
          Sources: USDA Economic Research Service, Food Expenditure Series (2023, lowest income fifth of U.S. households). Axonify survey of 1,200+ U.S. and
          Canadian grocery shoppers (August 2026). $219 is an illustrative yearly estimate, not a measured result.
        </p>
      </div>
    </section>
  );
}
