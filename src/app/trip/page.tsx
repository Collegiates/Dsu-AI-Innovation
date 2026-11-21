import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

/** Trip Plan page. Its logic is built and tested in src/lib/; the screen itself is the next build step. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trip Plan" description="Where to stop on the way home, and what to buy at each store." />
      <EmptyState icon={Hammer} title="This page is being built" description="The logic behind it is done and tested; the screen comes next." />
    </div>
  );
}
