import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRecalls, type Recall } from "./schema";

const OPENFDA_URL = "https://api.fda.gov/food/enforcement.json";
const TIMEOUT_MS = 5000;
const CACHE_MS = 60 * 60 * 1000;

/** Where the recalls came from: the live openFDA API, or the saved copy in data/fixtures/recalls.json. */
export type RecallSource = { recalls: Recall[]; source: "live" | "fixture"; ignored: number; reason?: string };

/** The openFDA address for food recalls reported in the 12 months before "now", newest first (up to 1,000). */
export function recallsUrl(now: Date): string {
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 1);
  return `${OPENFDA_URL}?search=report_date:[${ymd(from)}+TO+${ymd(now)}]&sort=report_date:desc&limit=1000`;
}

/** Reads the saved real openFDA response used in demo mode and whenever the live API can't be reached. */
export function fixtureRecalls(reason: string): RecallSource {
  try {
    const parsed = parseRecalls(JSON.parse(readFileSync(join(process.cwd(), "data", "fixtures", "recalls.json"), "utf8")));
    return { ...parsed, source: "fixture", reason };
  } catch {
    return { recalls: [], ignored: 0, source: "fixture", reason: `${reason}; fixture unreadable` };
  }
}

let cache: { at: number; value: RecallSource } | undefined;

/**
 * Gets recent food recalls from openFDA (the FDA's public data service), giving up after 5 seconds.
 * In demo mode, or if the API is slow, down, or returns something unexpected, it uses the saved copy instead.
 * Live results are kept for an hour. Malformed records are skipped and counted.
 * Example: fetchRecalls() → { source: "live", recalls: [...1000 recalls], ignored: 0 }.
 */
export async function fetchRecalls(options: { now?: Date; fetchImpl?: typeof fetch; useCache?: boolean } = {}): Promise<RecallSource> {
  if (process.env.DEMO_MODE === "true") return fixtureRecalls("demo-mode");
  const now = options.now ?? new Date();
  const useCache = options.useCache ?? true;
  if (useCache && cache && now.getTime() - cache.at < CACHE_MS) return cache.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)(recallsUrl(now), { signal: controller.signal });
    if (!response.ok) return fixtureRecalls(`openFDA returned ${response.status}`);
    const parsed = parseRecalls(await response.json());
    if (parsed.recalls.length === 0) return fixtureRecalls("openFDA returned no usable records");
    const value: RecallSource = { ...parsed, source: "live" };
    if (useCache) cache = { at: now.getTime(), value };
    return value;
  } catch {
    return fixtureRecalls(controller.signal.aborted ? "timeout" : "network error");
  } finally {
    clearTimeout(timer);
  }
}
