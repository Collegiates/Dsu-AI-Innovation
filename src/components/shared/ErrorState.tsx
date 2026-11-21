import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * What a section shows when its data couldn't be loaded: a plain-language message and what to do next.
 * It uses neutral colors, because red is kept for recalls only. Example: <ErrorState title="Prices couldn't be loaded" />.
 */
export function ErrorState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border bg-surface p-5">
      <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {action}
      </div>
    </div>
  );
}
