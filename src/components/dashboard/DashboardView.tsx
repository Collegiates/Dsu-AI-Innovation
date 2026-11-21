import type { DashboardData } from "@/lib/dashboard/data";
import { AttentionStrip } from "./AttentionStrip";
import { SavingsHero } from "./SavingsHero";
import { TripCard } from "./TripCard";

/**
 * The Dashboard's three blocks, and nothing else: savings, the recommended trip, and what needs attention.
 * Every number comes from the data passed in (computed by the optimizer), so this view can be tested with fixture data.
 */
export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <SavingsHero trip={data.trip} itemCount={data.itemCount} />
        </div>
        <div className="col-span-5">
          <TripCard trip={data.trip} stores={data.stores} />
        </div>
      </div>
      <AttentionStrip recall={data.recall} recallCount={data.recallCount} deals={data.deals} stores={data.stores} />
    </div>
  );
}
