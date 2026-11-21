import type { ReactNode } from "react";

/**
 * The heading at the top of a page: a serif title, an optional one-line description, and optional actions on the right.
 * Example: <PageHeader title="Trip Plan" description="Where to stop on the way home." />.
 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
