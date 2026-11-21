import { z } from "zod";
import type { TripPreference } from "@/lib/config/app";
import { WaitlistItemSchema, type WaitlistItem } from "@/lib/deals/detectDeals";

// Everything the app saves in the browser, with its allowed shape and its default. Nothing sensitive is stored here.
const short = z.string().trim().min(1).max(200);
const SCHEMAS = {
  hiddenBrands: { schema: z.array(short).max(200), fallback: [] as string[] },
  hiddenProducts: { schema: z.array(short).max(200), fallback: [] as string[] },
  waitlist: { schema: z.array(WaitlistItemSchema).max(100), fallback: [] as WaitlistItem[] },
  selectedPreference: { schema: z.enum(["fastest", "balanced", "maxSavings"]), fallback: "balanced" as TripPreference },
} as const;

/** The saved settings and their types. Example: preferences.hiddenBrands is a list of brand names. */
export type Preferences = { [K in keyof typeof SCHEMAS]: (typeof SCHEMAS)[K]["fallback"] };
export type PreferenceKey = keyof Preferences;

const storageKey = (key: PreferenceKey) => `grocerysave:${key}`;

/** The browser's localStorage, or null when there isn't one (server rendering) or the browser blocks it (private mode). */
function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Reads one saved setting from the browser. If storage is unavailable, the value is missing, isn't valid JSON,
 * or doesn't have the allowed shape, it returns the default instead of crashing.
 * Example: readPreference("waitlist") → [] on a first visit, or after someone corrupted the saved value.
 */
export function readPreference<K extends PreferenceKey>(key: K, storage: Storage | null = defaultStorage()): Preferences[K] {
  const { schema, fallback } = SCHEMAS[key];
  try {
    const raw = storage?.getItem(storageKey(key));
    if (raw == null) return fallback as Preferences[K];
    const parsed = schema.safeParse(JSON.parse(raw));
    return (parsed.success ? parsed.data : fallback) as Preferences[K];
  } catch {
    return fallback as Preferences[K];
  }
}

/**
 * Saves one setting in the browser after checking its shape. Returns false (and saves nothing) if the value is
 * invalid or storage is unavailable or full, so callers can carry on without it.
 * Example: writePreference("selectedPreference", "maxSavings") → true.
 */
export function writePreference<K extends PreferenceKey>(key: K, value: Preferences[K], storage: Storage | null = defaultStorage()): boolean {
  const parsed = SCHEMAS[key].schema.safeParse(value);
  if (!parsed.success || !storage) return false;
  try {
    storage.setItem(storageKey(key), JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}

/** Adds a brand to the "never show again" list (no duplicates, case-insensitive). Example: hideBrand("Great Value"). */
export function hideBrand(brand: string, storage: Storage | null = defaultStorage()): string[] {
  const current = readPreference("hiddenBrands", storage);
  const next = current.some((b) => b.toLowerCase() === brand.trim().toLowerCase()) ? current : [...current, brand.trim()];
  writePreference("hiddenBrands", next, storage);
  return next;
}

/** Adds a product id to the "never show again" list. Example: hideProduct("aldi-dover--tide--free-and-gentle-..."). */
export function hideProduct(productId: string, storage: Storage | null = defaultStorage()): string[] {
  const current = readPreference("hiddenProducts", storage);
  const next = current.includes(productId) ? current : [...current, productId];
  writePreference("hiddenProducts", next, storage);
  return next;
}
