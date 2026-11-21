import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { getDashboardData } from "@/lib/dashboard/data";

/** Loads this week's numbers and shows the three Dashboard blocks, or a plain message if the data isn't ready. */
async function DashboardContent() {
  const result = await getDashboardData();
  if (!result.ok) return <ErrorState title="This week's plan isn't ready yet" description={result.message} />;
  return <DashboardView data={result.data} />;
}

/**
 * The Dashboard (home page): this week's savings, the recommended trip, and anything that needs attention.
 * The numbers load at request time; a skeleton shows meanwhile.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="This week" description="Your weekly list, planned around the drive home." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
