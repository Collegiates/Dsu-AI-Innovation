/** A point in the hero drawing's coordinates. */
export type Point = { x: number; y: number };

/**
 * A point partway along a curved segment (a cubic Bézier curve: a start, two pull points and an end).
 * t = 0 is the start and t = 1 the end. Used to place the store pins exactly on the drawn route.
 * Example: cubicPoint(a, b, c, d, 0.5) → the middle of the curve.
 */
export function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** The hero route from DSU (left) to Home (right), as two smooth curves joined in the middle. */
export const ROUTE = {
  start: { x: 70, y: 500 },
  first: [{ x: 300, y: 540 }, { x: 430, y: 360 }, { x: 640, y: 350 }],
  // The second curve's first pull point mirrors the first curve's last one, so the joint is smooth.
  second: [{ x: 850, y: 340 }, { x: 930, y: 170 }, { x: 1130, y: 130 }],
} as const;

/** The route as an SVG path, built from ROUTE so the line and the pins always agree. */
export function routePath(): string {
  const [a, b, c] = ROUTE.first;
  const [, e, f] = ROUTE.second;
  return `M ${ROUTE.start.x} ${ROUTE.start.y} C ${a.x} ${a.y}, ${b.x} ${b.y}, ${c.x} ${c.y} S ${e.x} ${e.y}, ${f.x} ${f.y}`;
}

/**
 * Where a store pin sits: on the first or second curve, t of the way along it.
 * Example: pinPoint(2, 0.5) → the middle of the second curve.
 */
export function pinPoint(segment: 1 | 2, t: number): Point {
  if (segment === 1) {
    const [a, b, c] = ROUTE.first;
    return cubicPoint(ROUTE.start, a, b, c, t);
  }
  const [mirror, e, f] = ROUTE.second;
  return cubicPoint(ROUTE.first[2], mirror, e, f, t);
}
