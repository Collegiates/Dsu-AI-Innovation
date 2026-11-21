import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config/app";
import { CommuteAnimation } from "./CommuteAnimation";
import "./landing.css";

/**
 * The first screen: the promise in one line, what the app does in one sentence, and the "Try the demo" button,
 * with the animated store drawing behind them.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <CommuteAnimation className="pointer-events-none absolute right-[3%] bottom-8 w-[90%] max-w-[1320px] select-none" />
      <p className="absolute right-[4%] bottom-3 text-xs text-muted-foreground">Illustration</p>
      <div className="landing-hero-text relative mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl flex-col px-10 pt-20 pb-64">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Groceries, priced across your stores</p>
        <h1 id="hero-title" className="mt-4 max-w-2xl font-display text-6xl leading-[1.05] font-semibold tracking-tight">
          Pay less at the stores you already shop at.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          {APP_NAME} matches your weekly list to real prices at the stores you pick, then tells you where to shop, and whether a second stop is worth
          it.
        </p>
        <div className="mt-9 flex items-center gap-4">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/login">
              Try the demo <ArrowRight aria-hidden />
            </Link>
          </Button>
          <a href="#how-it-works" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
