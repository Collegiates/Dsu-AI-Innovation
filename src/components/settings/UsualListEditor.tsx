"use client";

import { Check, ListChecks } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_LIST } from "@/lib/config/demo";
import { parseListText } from "@/lib/list/list";
import { usePreference } from "@/lib/preferences/usePreference";

/**
 * Lets the shopper write down the groceries they buy most weeks, one per line, and save them in this browser.
 * "Load my usual list" on My List and a receipt upload start from this list.
 * Example: typing "oat milk" on a new line and pressing Save adds it to every new plan.
 */
export function UsualListEditor() {
  const { value: usual, ready, save } = usePreference("usualList");
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const text = draft ?? usual.join("\n");
  const items = parseListText(text).slice(0, 100);

  return (
    <section aria-labelledby="usual-title" className="rounded-2xl border bg-surface p-6">
      <h2 id="usual-title" className="flex items-center gap-2 font-display text-xl font-semibold">
        <ListChecks aria-hidden className="size-5 text-primary" /> Your usual list
      </h2>
      <p className="text-sm text-muted-foreground">What you buy most weeks, one item per line. Your plans start from this list.</p>
      <label htmlFor="usual-list" className="sr-only">
        Your usual list
      </label>
      <textarea
        id="usual-list"
        value={text}
        disabled={!ready}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        rows={10}
        maxLength={10_100}
        className="mt-4 w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-ring"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button
          onClick={() => {
            if (save(items)) {
              setDraft(null);
              setSaved(true);
            }
          }}
          disabled={!ready || items.length === 0 || draft === null}
        >
          Save usual list
        </Button>
        <Button variant="ghost" onClick={() => setDraft(DEMO_LIST.join("\n"))}>
          Start from the default list
        </Button>
        <p role="status" className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          {saved ? (
            <>
              <Check aria-hidden className="size-4 text-savings" /> Saved · {usual.length} items
            </>
          ) : (
            `${items.length} items`
          )}
        </p>
      </div>
    </section>
  );
}
