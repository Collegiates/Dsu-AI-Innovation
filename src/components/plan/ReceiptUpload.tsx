"use client";

import { Check, Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { postJson } from "@/lib/api/client";
import { entriesFromMatches } from "@/lib/list/list";
import type { MatchResult } from "@/lib/matching/core";
import { readPreference, writePreference } from "@/lib/preferences/storage";
import { RECEIPT_NOTES, uploadReceipt } from "@/lib/receipt/client";
import { DEFAULT_USUAL_STORE_ID } from "@/lib/trip/optimizer";
import { markReceiptUploaded } from "./AfterReceipt";

/**
 * The Dashboard's "Upload your receipt" button: sends the receipt (PDF, photo or text) to be read, matches its items
 * to real products, saves them as the grocery list, and opens the Trip Plan, which names the winning store(s).
 * If the receipt can't be read (or in demo mode), Tasha's sample list is used and the Trip Plan page says so.
 * Example: upload receipt.pdf → "Shop at ALDI + Walmart: $51.05" on /trip.
 */
// The steps shown while the plan is prepared. Each one names work the app really does.
const STEPS = [
  "Uploading your receipt",
  "Matching your list to real products",
  "Pricing your list at each of your stores",
  "Checking FDA food recalls",
  "Picking your best store",
] as const;
const STEP_MS = 1000;

export function ReceiptUpload() {
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" | "working" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [step, setStep] = useState(0);
  // Moves through the progress steps once a second while the plan is being prepared.
  useEffect(() => {
    if (state.kind !== "working") return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [state.kind]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStep(0);
    setState({ kind: "working" });
    // The upload step always takes at least 5 seconds, so each progress step can be read during the demo.
    const minimumWait = new Promise((resolve) => setTimeout(resolve, STEPS.length * STEP_MS));
    const receipt = await uploadReceipt(file);
    if (!receipt.ok) return setState({ kind: "error", message: receipt.message });
    // When the receipt can't be read, plan the shopper's usual list from Settings (the Trip Plan says so).
    const items = receipt.data.source === "demo-sample" ? readPreference("usualList") : receipt.data.items;
    const matched = await postJson<{ results: MatchResult[] }>("/api/match", { items });
    if (!matched.ok) return setState({ kind: "error", message: matched.message });
    writePreference("list", entriesFromMatches(matched.data.results, DEFAULT_USUAL_STORE_ID, readPreference("list")));
    try {
      sessionStorage.setItem("reroute:receipt-note", RECEIPT_NOTES[receipt.data.source]);
    } catch {
      // The note is a nicety; the plan works without it.
    }
    markReceiptUploaded();
    await minimumWait;
    router.push("/trip");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
        <Receipt aria-hidden className="size-4" />
        {state.kind === "working" ? "Finding the best store…" : "Upload your receipt"}
        <input
          type="file"
          accept="application/pdf,image/*,text/plain,.txt"
          className="sr-only"
          disabled={state.kind === "working"}
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {state.kind === "working" ? (
        <div role="status" aria-live="polite" className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="w-[26rem] rounded-2xl border bg-surface p-7 shadow-sm">
            <p className="font-display text-2xl font-semibold">Finding your best store</p>
            <ol className="mt-5 space-y-3">
              {STEPS.map((label, i) => (
                <li key={label} className={i > step ? "flex items-center gap-3 text-muted-foreground/60" : "flex items-center gap-3"}>
                  {i < step ? (
                    <Check aria-hidden className="size-4 text-savings" />
                  ) : i === step ? (
                    <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
                  ) : (
                    <span aria-hidden className="size-4 rounded-full border" />
                  )}
                  <span className={i === step ? "font-medium" : undefined}>{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="text-xs text-muted-foreground">
          {state.message}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">PDF, photo or text</p>
      )}
    </div>
  );
}
