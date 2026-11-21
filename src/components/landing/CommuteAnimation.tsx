import "./landing.css";
import { pinPoint, routePath, ROUTE } from "./geometry";
import { ALDI, FOOD_LION, TARGET, WALMART, type StoreMark } from "./storeLogos";

// Store pins in route order (nearest detour first, as in the app), where each sits on the line and when it pops in.
const PINS: { store: StoreMark; segment: 1 | 2; t: number; delay: number; best?: boolean }[] = [
  { store: WALMART, segment: 1, t: 0.42, delay: 0.75 },
  { store: ALDI, segment: 2, t: 0.12, delay: 1.2, best: true },
  { store: TARGET, segment: 2, t: 0.42, delay: 1.5 },
  { store: FOOD_LION, segment: 2, t: 0.7, delay: 1.8 },
];

/** The weekly saving shown at the Home end. Marketing illustration only (about $219 a year); the app's numbers come from code. */
export const HERO_SAVING = { amount: "$4.21 a week", label: "saved with smart swaps" } as const;

const BADGE_RADIUS = 27;
const BADGE_LIFT = 54; // how far above the route each badge's center sits
const LOGO_SIZE = 32;

function StoreBadge({ store, x, y }: { store: StoreMark; x: number; y: number }) {
  const cy = y - BADGE_LIFT;
  return (
    <>
      <line x1={x} y1={y} x2={x} y2={cy + BADGE_RADIUS} stroke="var(--border)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={x} cy={y} r={5} fill="var(--primary)" />
      <circle cx={x} cy={cy} r={BADGE_RADIUS} strokeWidth={3} className="landing-badge" />
      {"path" in store ? (
        <svg x={x - LOGO_SIZE / 2} y={cy - LOGO_SIZE / 2} width={LOGO_SIZE} height={LOGO_SIZE} viewBox={store.viewBox ?? "0 0 24 24"} overflow="hidden">
          <path d={store.path} fill={store.color} />
        </svg>
      ) : (
        <text x={x} y={cy + 6.5} textAnchor="middle" fill={store.color} fontSize={18} fontWeight={800} letterSpacing={0.5} fontFamily="var(--font-sans)">
          {store.letters}
        </text>
      )}
    </>
  );
}

/**
 * The hero's moving picture: the commute line draws itself from DSU to Home, a logo badge pops up for each store
 * along it, the best stop (ALDI) gets a green ring and a "Best stop" chip, and a weekly-savings callout appears at Home.
 * Pure SVG and CSS; it holds still for reduced motion. Labeled an illustration on the page.
 */
export function CommuteAnimation({ className }: { className?: string }) {
  const path = routePath();
  const home = ROUTE.second[2];
  const stores = PINS.map((p) => p.store.name).join(", ");
  return (
    <svg
      viewBox="0 0 1200 600"
      role="img"
      aria-label={`Illustration: a drive from DSU to Home past ${stores}. ALDI is marked as the best stop. ${HERO_SAVING.amount} ${HERO_SAVING.label}.`}
      className={className}
    >
      <defs>
        <pattern id="landing-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="var(--border)" />
        </pattern>
        <radialGradient id="landing-fade" cx="62%" cy="50%" r="60%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id="landing-mask">
          <rect width="1200" height="600" fill="url(#landing-fade)" />
        </mask>
        <filter id="landing-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1e2a22" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect width="1200" height="600" fill="url(#landing-dots)" mask="url(#landing-mask)" />

      {/* The road underneath, then the route drawn over it. */}
      <path d={path} fill="none" stroke="var(--secondary)" strokeWidth={22} strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--border)" strokeWidth={2} strokeDasharray="10 12" strokeLinecap="round" />
      <path d={path} pathLength={1} fill="none" stroke="var(--primary)" strokeWidth={6} strokeLinecap="round" className="landing-route" />

      {[
        { p: ROUTE.start, label: "DSU", delay: 0.1, anchor: "start" as const, dx: -6 },
        { p: home, label: "Home", delay: 2.1, anchor: "end" as const, dx: 6 },
      ].map(({ p, label, delay, anchor, dx }) => (
        <g key={label} className="landing-endpoint" style={{ "--delay": `${delay}s` } as React.CSSProperties}>
          <circle cx={p.x} cy={p.y} r={13} fill="var(--foreground)" />
          <circle cx={p.x} cy={p.y} r={5} fill="var(--surface)" />
          <text x={p.x + dx} y={p.y + 44} textAnchor={anchor} fill="var(--foreground)" fontSize={22} fontWeight={600} fontFamily="var(--font-sans)">
            {label}
          </text>
        </g>
      ))}

      {PINS.map((pin) => {
        const { x, y } = pinPoint(pin.segment, pin.t);
        const cy = y - BADGE_LIFT;
        return (
          <g key={pin.store.name}>
            {pin.best ? <circle cx={x} cy={cy} r={BADGE_RADIUS} className="landing-ripple" /> : null}
            <g className={`landing-pin ${pin.best ? "landing-pin-best" : ""}`} style={{ "--delay": `${pin.delay}s` } as React.CSSProperties} filter="url(#landing-shadow)">
              <StoreBadge store={pin.store} x={x} y={y} />
            </g>
            {pin.best ? (
              <g className="landing-tag" style={{ "--delay": "2.5s" } as React.CSSProperties}>
                <rect x={x - 56} y={cy - 74} width={112} height={34} rx={17} fill="var(--savings)" />
                <path d={`M ${x - 7} ${cy - 41} L ${x} ${cy - 34} L ${x + 7} ${cy - 41} Z`} fill="var(--savings)" />
                <text x={x} y={cy - 51} textAnchor="middle" fill="white" fontSize={17} fontWeight={700} fontFamily="var(--font-sans)">
                  Best stop
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {/* The weekly saving, at the Home end of the drive: it belongs to the whole trip, not to one store. */}
      <g className="landing-tag" style={{ "--delay": "2.4s" } as React.CSSProperties} filter="url(#landing-shadow)">
        <rect x={home.x - 228} y={12} width={256} height={80} rx={18} fill="var(--savings)" />
        <path d={`M ${home.x - 8} 91 L ${home.x} 101 L ${home.x + 8} 91 Z`} fill="var(--savings)" />
        <text x={home.x - 206} y={48} fill="white" fontSize={28} fontWeight={700} fontFamily="var(--font-sans)">
          {HERO_SAVING.amount}
        </text>
        <text x={home.x - 206} y={74} fill="white" fillOpacity={0.9} fontSize={17} fontFamily="var(--font-sans)">
          {HERO_SAVING.label}
        </text>
      </g>
    </svg>
  );
}
