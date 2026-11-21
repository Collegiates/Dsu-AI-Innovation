import { Suspense } from "react";
import { SettingsView } from "@/components/settings/SettingsView";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";

/** Settings page: the commute, the stores on it, the default trip preference, and hidden brands and products. */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your route, the stores on it, and what you've hidden." />
      <Suspense fallback={<LoadingSkeleton className="h-96" />}>
        <WithCatalog>{({ products, stores }) => <SettingsView products={products} stores={stores} />}</WithCatalog>
      </Suspense>
    </div>
  );
}
