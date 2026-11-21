import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";

/** My List page. Its logic is built and tested in src/lib/; the screen itself is the next build step. */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="My List" description="Type your weekly list and see the matching products." />
      <EmptyState icon={Hammer} title="This page is being built" description="The logic behind it is done and tested; the screen comes next." />
    </div>
  );
}
