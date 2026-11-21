import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequireDemo } from "@/lib/auth/RequireDemo";
import { getDashboardData } from "@/lib/dashboard/data";

/** Loads this week's numbers and shows the three Dashboard blocks, or a plain message if the data isn't ready. */
async function DashboardContent() {
  const result = await getDashboardData();
  if (!result.ok) return <ErrorState title="This week's plan isn't ready yet" description={result.message} />;
  return <DashboardView data={result.data} />;
}

/**
 * The Dashboard (/plan, demo login required): the stores you shop at, this week's savings, the recommended trip,
 * and anything that needs attention.
 * It is where the demo login lands. The numbers load at request time; a skeleton shows meanwhile.
 */
export default function DashboardPage() {
  return (
    <RequireDemo>
      <div className="space-y-6">
        <PageHeader title="This week" description="Your weekly list, planned across the stores you pick." />
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </RequireDemo>
  );
}
