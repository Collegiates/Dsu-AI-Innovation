import { Suspense } from "react";
import { DealWatch } from "@/components/deals/DealWatch";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";
import { loadNextWeekPrices } from "@/lib/deals/fixture";

/**
 * Deal Watch page: occasional buys the shopper is waiting to get cheap, with today's best prices and optional targets.
 * The simulated next-week prices are read on the server and clearly labeled as simulated on the page.
 */
export default function DealsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Deal Watch" description="Things you buy now and then. We tell you when they get cheap." />
      <Suspense fallback={<LoadingSkeleton className="h-[420px]" />}>
        <WithCatalog>{({ products, stores }) => <DealWatch products={products} stores={stores} nextWeek={loadNextWeekPrices()} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
