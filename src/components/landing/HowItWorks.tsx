import { ArrowRight, ListChecks, Route, Store, type LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Store, title: "Pick your stores", text: "Choose the stores on your drive home. We note how far each one is off your route." },
  { icon: ListChecks, title: "Add your list", text: "Type it the way you'd write it, like “2% milk, eggs, rice”. Each line is matched to a real product." },
  { icon: Route, title: "We find the cheapest stop", text: "Every combination of stores is priced, with gas and time counted, so you know where to stop and what to buy." },
];

/** "How it works": three numbered steps in a row, each sliding in as it scrolls into view. */
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-8 px-10 py-24">
      <Reveal>
        <h2 id="how-title" className="font-display text-4xl font-semibold tracking-tight">
          How it works
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">Three steps, about a minute, once a week.</p>
      </Reveal>
      <ol className="mt-10 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="contents">
            <Reveal delay={i * 0.12} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border bg-surface p-7">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <step.icon aria-hidden className="size-5" />
                  </span>
                  <span className="font-display text-4xl font-semibold text-border" aria-hidden>
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-muted-foreground">{step.text}</p>
              </div>
            </Reveal>
            {i < STEPS.length - 1 ? <ArrowRight aria-hidden className="size-5 self-center text-muted-foreground" /> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
