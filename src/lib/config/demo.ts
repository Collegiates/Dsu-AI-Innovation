/**
 * The weekly list typed during the live demo, written the way a real shopper would type it.
 * Its embeddings are saved in data/fixtures/ so the demo works with no internet.
 * Example: "2% milk" should match the 2% gallon milk at Aldi and Walmart.
 */
export const DEMO_LIST = [
  "2% milk",
  "eggs",
  "whole wheat bread",
  "bananas",
  "chicken breast",
  "rice",
  "penne",
  "cereal",
  "greek yogurt",
  "peanut butter",
  "coffee",
  "frozen mixed berries",
  "toothpaste",
  "shampoo",
  "paper towels",
  "laundry detergent",
] as const;

/** The weekly part of the demo list (the first 12 items); the rest are occasional buys tracked in Deal Watch. */
export const DEMO_WEEKLY_LIST = DEMO_LIST.slice(0, 12);

/**
 * The Deal Watch waitlist used in the demo: occasional buys, one with a target price.
 * With the simulated next-week prices, toothpaste and detergent drop 10%+, paper towels hit the $7.50 target,
 * and shampoo doesn't change, so it shows no alert.
 */
export const DEMO_WAITLIST = [
  { groupKey: "toothpaste-fluoride-whitening" },
  { groupKey: "shampoo-antidandruff" },
  { groupKey: "paper-towels-6roll", targetPrice: 7.5 },
  { groupKey: "detergent-liquid-freeclear" },
];

/**
 * A national FDA recall shown as a hypothetical past purchase, so the demo can show what a recall alert looks like.
 * Every fact is copied from the FDA-posted company announcement (Sept 2, 2026) linked below; the "past purchase" is made up
 * and labeled so. The recall did not list Delaware. Example: shown as a banner on Trip Plan and in full on Recalls & Safety.
 */
export const DEMO_PAST_PURCHASE_RECALL = {
  label: "National recall example: hypothetical past purchase; not listed for Delaware.",
  product: "Great Value Organic Triple Berry Blend, 10 oz",
  upc: "7874211226",
  lotCode: "6040 01-6",
  bestBy: "February 9, 2028",
  reason: "Possible contamination with E. coli O145",
  firm: "Frutas y Hortalizas del Sur S.A.",
  announced: "September 2, 2026",
  recallNumber: "H-1380-2026",
  url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/frutas-y-hortalizas-del-sur-sa-expands-recall-include-one-lot-great-value-frozen-organic-triple",
} as const;
