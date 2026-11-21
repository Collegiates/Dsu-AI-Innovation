import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * What a section shows when there is nothing to show yet, with an icon, a short message and an optional next step.
 * Example: <EmptyState icon={Tag} title="No price drops yet" action={<Link href="/deals">Open Deal Watch</Link>} />.
 */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed bg-surface/60 p-5">
      <Icon aria-hidden className="size-5 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
