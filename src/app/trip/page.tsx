import { Suspense } from "react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";
import { TripPlanner } from "@/components/trip/TripPlanner";

/**
 * Trip Plan page (the main demo screen): which stores to stop at on the drive home and what to buy at each,
 * worked out by the trip optimizer from the saved list. Changing the preference re-plans instantly.
 */
export default function TripPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trip Plan" description="Where to stop on the way home, and what to buy at each store." />
      <Suspense fallback={<LoadingSkeleton className="h-[520px]" />}>
        <WithCatalog>{({ products, stores }) => <TripPlanner products={products} stores={stores} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
