/**
 * How much a store adds to the drive home, in words.
 * Example: a store with no detour → "On your route"; ALDI 4 minutes and 1.2 miles off → "+4 min · 1.2 mi".
 */
export function detourText(store: { detourMinutes: number; detourMiles: number }): string {
  return store.detourMinutes === 0 && store.detourMiles === 0 ? "On your route" : `+${store.detourMinutes} min · ${store.detourMiles} mi`;
}
