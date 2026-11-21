"use client";

import { CircleCheck, Database, ExternalLink, ListChecks, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/api/client";
import type { Product } from "@/lib/data/schema";
import type { RecallMatch } from "@/lib/recalls/match";
import { usePreference } from "@/lib/preferences/usePreference";
import { compatibleAlternatives } from "@/lib/trip/basket";

type RecallReply = { source: "live" | "fixture"; checked: number; label: string; matches: RecallMatch[] };
type CheckState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; at: Date; reply: RecallReply };

/**
 * The FDA's own public record for one recall number, from openFDA (the FDA's public data service).
 * Example: fdaRecordUrl("H-0167-2027") → https://api.fda.gov/food/enforcement.json?search=recall_number:"H-0167-2027".
 */
export function fdaRecordUrl(recallNumber: string): string {
  return `https://api.fda.gov/food/enforcement.json?search=recall_number:${encodeURIComponent(`"${recallNumber}"`)}`;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * Recalls & Safety: "Check my list now" sends the list's products (and the equivalents the trip might buy instead)
 * to /api/recalls, which compares them with FDA food recalls. Possible matches show the reason, class, date, recall number,
 * a link to the FDA record and the "check the lot code" message. It also says when it checked and whether the data was
 * live or the saved copy. Example: "Great Value Fruit Cocktail — Class II — lead — H-0167-2027".
 */
export function RecallsView({ products }: { products: Product[] }) {
  const { value: entries, ready } = usePreference("list");
  const [state, setState] = useState<CheckState>({ kind: "idle" });
  const productIds = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const ids = new Set<string>();
    for (const entry of entries) {
      const usual = entry.productId ? byId.get(entry.productId) : undefined;
      if (usual) for (const p of compatibleAlternatives(usual, products)) ids.add(p.id);
    }
    return [...ids];
  }, [entries, products]);

  async function check() {
    setState({ kind: "loading" });
    const reply = await postJson<RecallReply>("/api/recalls", { productIds });
    setState(reply.ok ? { kind: "done", at: new Date(), reply: reply.data } : { kind: "error", message: reply.message });
  }

  if (!ready) return <LoadingSkeleton className="h-64" />;
  if (productIds.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No list to check yet"
        description="Add your weekly items on My List, then check them against FDA food recalls here."
        action={
          <Button asChild>
            <Link href="/list">Go to My List</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-6 rounded-2xl border bg-surface p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">
              {productIds.length} products from your list, including the equivalents your trip might buy instead
            </p>
            <p className="text-sm text-muted-foreground">
              A product is flagged only when a recall names its brand and a key product word. It is always a possible match, never certain.
            </p>
          </div>
        </div>
        <Button size="lg" onClick={check} disabled={state.kind === "loading"}>
          <ShieldCheck aria-hidden />
          {state.kind === "loading" ? "Checking…" : "Check my list now"}
        </Button>
      </div>

      {state.kind === "done" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Database aria-hidden className="size-4" />
          Last checked {state.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} against {state.reply.checked.toLocaleString("en-US")} FDA food
          recalls from the last 12 months ·{" "}
          <span className="font-medium text-foreground">{state.reply.source === "live" ? "Live from openFDA" : "Saved copy of openFDA data (offline)"}</span>
        </p>
      ) : null}

      {state.kind === "loading" ? <LoadingSkeleton className="h-40" /> : null}
      {state.kind === "error" ? <ErrorState title="The recall check didn't finish" description={state.message} /> : null}
      {state.kind === "idle" ? (
        <EmptyState icon={ShieldCheck} title="Not checked yet" description="Press Check my list now to compare your list with recent FDA food recalls." />
      ) : null}
      {state.kind === "done" && state.reply.matches.length === 0 ? (
        <EmptyState icon={CircleCheck} title="No possible matches" description="None of the products on your list match a recent FDA food recall." />
      ) : null}
      {state.kind === "done" && state.reply.matches.length > 0 ? (
        <ul className="space-y-3">
          {state.reply.matches.map((m) => (
            <li key={`${m.recallNumber}-${m.productId}`} aria-label={`Possible recall: ${m.productName}`} className="rounded-2xl border border-recall/30 bg-recall-soft p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-recall">
                <ShieldAlert aria-hidden className="size-4" />
                {m.label}
              </p>
              <p className="mt-2 text-lg font-medium">{m.productName}</p>
              <p className="mt-1 text-sm">{m.reason}</p>
              <dl className="mt-3 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Classification</dt>
                  <dd className="font-medium">{m.classification}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Reported</dt>
                  <dd className="font-medium">{formatDate(m.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Recall number</dt>
                  <dd className="font-medium">{m.recallNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Recalling firm</dt>
                  <dd className="font-medium">{m.firm}</dd>
                </div>
              </dl>
              <a
                href={fdaRecordUrl(m.recallNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-recall underline-offset-4 hover:underline"
              >
                View the FDA record <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
