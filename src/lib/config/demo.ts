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
