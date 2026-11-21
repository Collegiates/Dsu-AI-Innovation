import { Suspense } from "react";
import { RecallsView } from "@/components/recalls/RecallsView";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";

/**
 * Recalls & Safety page: checks the saved list against recent FDA food recalls (live, or the saved copy offline)
 * and shows any possible matches with what to check on the package.
 */
export default function RecallsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Recalls & Safety" description="Check your list against recent FDA food recalls." />
      <Suspense fallback={<LoadingSkeleton className="h-64" />}>
        <WithCatalog>{({ products }) => <RecallsView products={products} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
