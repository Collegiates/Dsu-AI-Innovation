import { ExternalLink, ShieldAlert } from "lucide-react";
import { DEMO_PAST_PURCHASE_RECALL as R } from "@/lib/config/demo";

/**
 * Shows a real national FDA recall as a hypothetical past purchase, so the demo can show a recall alert honestly.
 * Every fact comes from the FDA announcement it links to; the card says plainly that the purchase is made up and
 * that the recall did not list Delaware. Example: "Great Value Organic Triple Berry Blend, 10 oz · lot 6040 01-6".
 */
export function PastPurchaseRecall() {
  return (
    <section aria-labelledby="past-recall-title" className="rounded-2xl border border-recall/30 bg-recall-soft p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-recall">
        <ShieldAlert aria-hidden className="size-4" />
        From your past purchases · Possible match — check the lot code on your package
      </p>
      <h2 id="past-recall-title" className="mt-2 text-lg font-medium">
        {R.product}
      </h2>
      <p className="text-sm text-muted-foreground">{R.label}</p>
      <p className="mt-2 text-sm">{R.reason}.</p>
      <dl className="mt-3 grid grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Lot code (front of package)</dt>
          <dd className="font-medium">{R.lotCode}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Best if used by</dt>
          <dd className="font-medium">{R.bestBy}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">UPC</dt>
          <dd className="font-medium tabular-nums">{R.upc}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Recall number</dt>
          <dd className="font-medium">{R.recallNumber}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm">
        {R.firm}, announced {R.announced}. Don&apos;t eat it: throw it away or return it to Walmart for a refund.
      </p>
      <a
        href={R.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-recall underline-offset-4 hover:underline"
      >
        Read the FDA announcement <ExternalLink aria-hidden className="size-3.5" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </section>
  );
}
