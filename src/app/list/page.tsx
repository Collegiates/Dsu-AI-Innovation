import { Suspense } from "react";
import { ListBuilder } from "@/components/list/ListBuilder";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";

/**
 * My List page: type the weekly list, see which real product each line matched and how sure the match is.
 * The list is saved in the browser and feeds the Trip Plan, Smart Swaps and Recalls pages.
 */
export default function ListPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My List" description="Type your weekly list and see the matching products." />
      <Suspense fallback={<LoadingSkeleton className="h-[480px]" />}>
        <WithCatalog>{({ products, stores }) => <ListBuilder products={products} stores={stores} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
