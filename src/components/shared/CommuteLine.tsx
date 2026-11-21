import type { Store } from "@/lib/data/schema";

/**
 * A simple drawing of the drive from work to home with a pin for each store, in order of how far each is off the
 * route. Stores in the plan are filled in; the rest are outlines. It's a diagram, not a map, so no map service is needed.
 * Example: DSU ——●Walmart——○ALDI—— Home, with Walmart filled because the plan stops there.
 */
export function CommuteLine({ stores, stopIds, from, to }: { stores: Store[]; stopIds: string[]; from: string; to: string }) {
  const ordered = [...stores].sort((a, b) => a.detourMinutes - b.detourMinutes || a.id.localeCompare(b.id));
  const width = 400;
  const y = 44;
  const x0 = 28;
  const x1 = width - 28;
  const xFor = (i: number) => x0 + ((i + 1) * (x1 - x0)) / (ordered.length + 1);
  const label = `Drive from ${from} to ${to}. Stops: ${stopIds.length > 0 ? ordered.filter((s) => stopIds.includes(s.id)).map((s) => s.chain).join(", ") : "none"}.`;

  return (
    <svg viewBox={`0 0 ${width} 96`} role="img" aria-label={label} className="w-full">
      <line x1={x0} y1={y} x2={x1} y2={y} className="stroke-border" strokeWidth={4} strokeLinecap="round" />
      {[{ x: x0, text: from }, { x: x1, text: to }].map((end) => (
        <g key={end.text}>
          <circle cx={end.x} cy={y} r={7} className="fill-foreground" />
          <text x={end.x} y={y + 30} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
            {end.text}
          </text>
        </g>
      ))}
      {ordered.map((store, i) => {
        const x = xFor(i);
        const isStop = stopIds.includes(store.id);
        return (
          <g key={store.id}>
            <line x1={x} y1={y} x2={x} y2={y - 16} className={isStop ? "stroke-primary" : "stroke-input"} strokeWidth={2} />
            <circle cx={x} cy={y - 22} r={7} className={isStop ? "fill-primary" : "fill-surface stroke-input"} strokeWidth={2} />
            <text x={x} y={y + 24} textAnchor="middle" className={`text-[12.5px] ${isStop ? "fill-foreground font-semibold" : "fill-muted-foreground font-medium"}`}>
              {store.chain}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
