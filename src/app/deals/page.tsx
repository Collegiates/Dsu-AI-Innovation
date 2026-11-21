import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

/** Deal Watch page. Its logic is built and tested in src/lib/; the screen itself is the next build step. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Deal Watch" description="Occasional buys you're waiting to get on sale." />
      <EmptyState icon={Hammer} title="This page is being built" description="The logic behind it is done and tested; the screen comes next." />
    </div>
  );
}
