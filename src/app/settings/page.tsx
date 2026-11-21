import { Suspense } from "react";
import { SettingsView } from "@/components/settings/SettingsView";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { WithCatalog } from "@/components/shared/WithCatalog";
import { RequireDemo } from "@/lib/auth/RequireDemo";

/** Settings page (demo login required): the stores you shop at, the default trip preference, and hidden brands and products. */
export default function SettingsPage() {
  return (
    <RequireDemo>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Your usual list, your stores, and what you've hidden." />
        <Suspense fallback={<LoadingSkeleton className="h-96" />}>
          <WithCatalog>{({ products, stores }) => <SettingsView products={products} stores={stores} />}</WithCatalog>
        </Suspense>
      </div>
    </RequireDemo>
  );
}
