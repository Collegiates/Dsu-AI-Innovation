import { AfterReceipt } from "@/components/plan/AfterReceipt";
import { StorePicker } from "@/components/plan/StorePicker";
import type { DashboardData } from "@/lib/dashboard/data";
import { AttentionStrip } from "./AttentionStrip";
import { SavingsHero } from "./SavingsHero";
import { TripCard } from "./TripCard";

/**
 * The Dashboard: savings, the shopper's stores with the recommended trip, and what needs attention.
 * Every number comes from the data passed in (computed by the optimizer), so this view can be tested with fixture data.
 */
export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <AfterReceipt>
            <SavingsHero ranking={data.ranking} itemCount={data.itemCount} />
          </AfterReceipt>
        </div>
        <div className="col-span-5 flex flex-col gap-4">
          <StorePicker stores={data.stores} pricedStoreIds={data.pricedStoreIds} columns={1} />
          <AfterReceipt fallbackHidden>
            <TripCard ranking={data.ranking} />
          </AfterReceipt>
        </div>
      </div>
      <AttentionStrip recall={data.recall} recallCount={data.recallCount} deals={data.deals} stores={data.stores} />
    </div>
  );
}
