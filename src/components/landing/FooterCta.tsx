import { ArrowRight, Leaf } from "lucide-react";
import Link from "next/link";
import { DataSourceNote } from "@/components/shared/DataSourceNote";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config/app";
import { Reveal } from "./Reveal";

/** The closing call to action and the page footer, with the data-honesty note. */
export function FooterCta() {
  return (
    <footer className="mx-auto max-w-6xl px-10 pb-12">
      <Reveal>
        <div className="flex items-center justify-between gap-10 rounded-3xl border bg-surface px-12 py-12">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight">Your grocery trip, already planned.</h2>
            <p className="mt-2 text-lg text-muted-foreground">See this week&apos;s cheapest store in under a minute. No sign-up.</p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 px-6 text-base">
            <Link href="/login">
              Try the demo <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </Reveal>
      <div className="mt-10 flex items-center justify-between gap-6 border-t pt-6">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Leaf aria-hidden className="size-4 text-primary" />
          {APP_NAME}
        </p>
        <DataSourceNote />
      </div>
    </footer>
  );
}
