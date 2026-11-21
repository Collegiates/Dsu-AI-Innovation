/**
 * The product name shown in the browser tab, the sidebar and the page headings.
 * Change it here and the whole app follows, so a rename is a one-line edit.
 * Example: APP_NAME = "GrocerySave" makes the tab read "GrocerySave".
 */
export const APP_NAME = "GrocerySave";

/**
 * The data-honesty line shown on the trip and list pages, so nobody mistakes online prices for checkout prices.
 * Example: it appears under the trip total as small grey text.
 */
export const DATA_SOURCE_NOTE = "Online prices from aldi.us and walmart.com, viewed Nov 21, 2026. In-store prices may differ.";

/**
 * How much the shopper cares about time versus money.
 * "fastest" = time matters a lot, "balanced" = a middle ground, "maxSavings" = only money counts.
 * Example: a shopper who picks "balanced" accepts a 10-minute detour if it saves more than $3.
 */
export type TripPreference = "fastest" | "balanced" | "maxSavings";

/**
 * The fixed numbers the trip planner uses when it weighs savings against extra driving.
 * They are written down here, in one place, so judges and teammates can see and question every assumption.
 * Example: a 4-mile detour costs 4 × $0.15 = $0.60 in gas.
 */
export const assumptions = {
  // Gas cost for each extra mile driven, in dollars.
  // Based on roughly $3.00 per gallon and a car that gets about 20 miles per gallon.
  gasCostPerMile: 0.15,

  // Extra minutes each additional store adds for parking, walking in and checking out,
  // on top of the driving detour itself.
  minutesPerExtraStop: 10,

  // What one minute of the shopper's time is worth, in dollars, for each preference.
  // fastest: $1.00 per minute (about $60 an hour), so detours are only worth it for big savings.
  // balanced: $0.30 per minute (about $18 an hour), close to a typical hourly wage.
  // maxSavings: $0.00 per minute, so time is free and only the cheapest total matters.
  timeValuePerMinute: {
    fastest: 1.0,
    balanced: 0.3,
    maxSavings: 0.0,
  } satisfies Record<TripPreference, number>,
} as const;

/**
 * Limits and thresholds for the AI features, kept in one place so they can be tuned and explained.
 * Example: an embedding similarity of 0.82 for "2% milk" vs. a 2% milk product counts as "Same product".
 */
export const aiConfig = {
  // Embedding similarity (cosine, from 0 to 1) at or above which a match is labeled "Same product".
  sameProductThreshold: 0.8,
  // Below sameProductThreshold but at or above this, a match is labeled "Similar"; lower means "No match".
  similarThreshold: 0.6,
  // Keyword fallback: share of the typed words that must be found in a product to count as a match.
  keywordMatchThreshold: 0.5,
  // How many nearest catalog products the embedding search keeps before code filters them.
  topCandidates: 5,
  // Every Gemini call gives up after this long and the app uses its non-AI fallback instead.
  timeoutMs: 5000,
  // Longest swap explanation, in words, that Gemini may write.
  maxExplanationWords: 25,
} as const;

/**
 * Input limits for every API route, so one request can't flood the app or the AI.
 * Example: a list with 101 items, or an item 101 characters long, is rejected.
 */
export const inputLimits = {
  maxListItems: 100,
  maxItemChars: 100,
  // AI routes accept this many requests per minute from one address.
  aiRequestsPerMinute: 30,
} as const;
