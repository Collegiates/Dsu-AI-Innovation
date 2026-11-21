import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

/** Settings page. Its logic is built and tested in src/lib/; the screen itself is the next build step. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your route, stores and hidden brands." />
      <EmptyState icon={Hammer} title="This page is being built" description="The logic behind it is done and tested; the screen comes next." />
    </div>
  );
}
