import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";
import { SwapsView } from "@/components/swaps/SwapsView";

/**
 * Smart Swaps page: cheaper similar products for items on the saved list, each with the saving worked out by code
 * and a short checked explanation. Hidden brands and products are managed on Settings.
 */
export default function SwapsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Smart Swaps" description="Cheaper products like the ones you buy, compared fairly by unit price." />
      <Suspense fallback={<LoadingSkeleton className="h-[480px]" />}>
        <WithCatalog>{({ products, stores }) => <SwapsView products={products} stores={stores} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
