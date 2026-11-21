import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

/** The Dashboard's loading state: the same three blocks as soft placeholders, so nothing jumps when data arrives. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading this week's plan">
      <div className="grid grid-cols-12 gap-6">
        <LoadingSkeleton className="col-span-7 h-[420px]" />
        <LoadingSkeleton className="col-span-5 h-[420px]" />
      </div>
      <LoadingSkeleton className="h-40" />
    </div>
  );
}
