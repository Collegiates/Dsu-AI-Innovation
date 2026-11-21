import { Calculator, Link2, Sparkles, type LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";

const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Calculator, title: "Code does the math.", text: "Prices, totals, savings and the trip itself are worked out by plain, tested code. Never by AI." },
  { icon: Sparkles, title: "AI does the words.", text: "AI reads your messy list and writes short explanations. Every number it writes is checked against the code's." },
  { icon: Link2, title: "Every price links to its store page.", text: "Prices come from the stores' own websites, with the date they were viewed." },
];

/** The short trust section: who computes what, and where every price comes from. */
export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-6xl px-10 py-24">
      <Reveal>
        <h2 id="trust-title" className="max-w-3xl font-display text-4xl font-semibold tracking-tight">
          Numbers you can check.
        </h2>
      </Reveal>
      <ul className="mt-10 grid grid-cols-3 gap-10">
        {POINTS.map((point, i) => (
          <li key={point.title}>
            <Reveal delay={i * 0.1}>
              <point.icon aria-hidden className="size-6 text-primary" />
              <p className="mt-4 font-display text-2xl font-semibold">{point.title}</p>
              <p className="mt-2 text-muted-foreground">{point.text}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
