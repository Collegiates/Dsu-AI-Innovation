import { pinPoint, routePath, ROUTE } from "./geometry";
import "./landing.css";

// Store pins along the route: which curve, how far along, and when each pops in (as the line reaches it).
const PINS = [
  { segment: 1, t: 0.42, delay: 0.75 },
  { segment: 2, t: 0.12, delay: 1.25 },
  { segment: 2, t: 0.5, delay: 1.6, win: true },
  { segment: 2, t: 0.82, delay: 1.9 },
] as const;

/** The amount shown on the winning pin. Marketing illustration only; the app's real numbers come from the optimizer. */
export const HERO_SAVING = "$4.21 saved";

/**
 * The hero's moving picture: the commute line draws itself from DSU to Home, store pins pop up along it,
 * and one pin turns green with a "$4.21 saved" tag. It's pure SVG and CSS, and holds still for reduced motion.
 * Decorative: the headline says the same thing in words, so screen readers get one short description.
 */
export function CommuteAnimation({ className }: { className?: string }) {
  const path = routePath();
  const end = ROUTE.second[2];
  return (
    <svg viewBox="0 0 1200 600" role="img" aria-label="A drive from DSU to Home with grocery stores along the way; one stop is marked $4.21 saved." className={className}>
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
      </defs>
      <rect width="1200" height="600" fill="url(#landing-dots)" mask="url(#landing-mask)" />

      {/* The road underneath, then the route drawn over it. */}
      <path d={path} fill="none" stroke="var(--secondary)" strokeWidth={22} strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--border)" strokeWidth={2} strokeDasharray="10 12" strokeLinecap="round" />
      <path d={path} pathLength={1} fill="none" stroke="var(--primary)" strokeWidth={6} strokeLinecap="round" className="landing-route" />

      {[
        { p: ROUTE.start, label: "DSU", delay: 0.1, anchor: "start" as const, dx: -6 },
        { p: end, label: "Home", delay: 2.0, anchor: "end" as const, dx: 6 },
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
        const isWin = "win" in pin && pin.win;
        return (
          <g key={`${pin.segment}-${pin.t}`}>
            {isWin ? <circle cx={x} cy={y} r={14} className="landing-ripple" /> : null}
            <g className={`landing-pin ${isWin ? "landing-pin-win" : ""}`} style={{ "--delay": `${pin.delay}s` } as React.CSSProperties}>
              <path
                d={`M ${x} ${y} C ${x - 4} ${y - 14}, ${x - 18} ${y - 22}, ${x - 18} ${y - 38} A 18 18 0 1 1 ${x + 18} ${y - 38} C ${x + 18} ${y - 22}, ${x + 4} ${y - 14}, ${x} ${y} Z`}
                strokeWidth={3}
                className="landing-pin-head"
              />
              <circle cx={x} cy={y - 38} r={6.5} className="landing-pin-dot" />
            </g>
            {isWin ? (
              <g className="landing-tag">
                <rect x={x - 82} y={y - 118} width={164} height={50} rx={25} fill="var(--savings)" />
                <path d={`M ${x - 9} ${y - 69} L ${x} ${y - 60} L ${x + 9} ${y - 69} Z`} fill="var(--savings)" />
                <text x={x} y={y - 86} textAnchor="middle" fill="white" fontSize={23} fontWeight={700} fontFamily="var(--font-sans)">
                  {HERO_SAVING}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
