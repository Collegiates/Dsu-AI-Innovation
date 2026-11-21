"use client";

import { Receipt } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

/** The browser key that says a receipt was uploaded in this browser. It holds only "true". */
export const RECEIPT_UPLOADED_KEY = "reroute:receipt-uploaded";
/** Fired after an upload, so open pages can show the results at once. */
export const RECEIPT_EVENT = "reroute:receipt";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECEIPT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECEIPT_EVENT, onChange);
  };
}

function uploaded(): boolean {
  try {
    return localStorage.getItem(RECEIPT_UPLOADED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Remembers that a receipt was uploaded, so the Dashboard shows this week's winner from now on. */
export function markReceiptUploaded(): void {
  try {
    localStorage.setItem(RECEIPT_UPLOADED_KEY, "true");
  } catch {
    // Storage blocked: the Trip Plan still opens with the results.
  }
  window.dispatchEvent(new Event(RECEIPT_EVENT));
}

/**
 * Shows its content (the savings and the winning store) only after a receipt has been uploaded;
 * before that, a card asks the shopper to upload one (or nothing, with fallbackHidden).
 * Example: a first visit to /plan shows "Upload your receipt…" and no winner.
 */
export function AfterReceipt({ children, fallbackHidden = false }: { children: ReactNode; fallbackHidden?: boolean }) {
  const done = useSyncExternalStore(subscribe, uploaded, () => false);
  if (done) return <>{children}</>;
  if (fallbackHidden) return null;
  return (
    <section aria-labelledby="upload-first-title" className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed bg-surface p-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-primary-soft">
        <Receipt aria-hidden className="size-7 text-primary" />
      </span>
      <h2 id="upload-first-title" className="mt-5 font-display text-3xl font-semibold tracking-tight">
        Upload your receipt to find this week&apos;s best store
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        We&apos;ll turn it into your grocery list, compare your stores, and name the winner. Use the &ldquo;Upload your receipt&rdquo; button at the top.
      </p>
    </section>
  );
}
