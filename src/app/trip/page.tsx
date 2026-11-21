import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";
import { TripPlanner } from "@/components/trip/TripPlanner";

/**
 * Trip Plan page (the main demo screen): which of your picked stores to shop at and what to buy at each,
 * worked out by the trip optimizer from the saved list. Changing the preference re-plans instantly.
 */
export default function TripPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trip Plan" description="Where to shop among your stores, and what to buy at each." />
      <Suspense fallback={<LoadingSkeleton className="h-[520px]" />}>
        <WithCatalog>{({ products, stores }) => <TripPlanner products={products} stores={stores} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
