/**
 * Turns a weekly saving into a monthly one: 52 weeks spread over 12 months (about 4.33 weeks a month).
 * Example: $1.13 a week → $4.90 a month (113 × 52 ÷ 12 = 489.7 cents, rounded to the nearest cent).
 */
export function weeklyToMonthlyCents(weeklyCents: number): number {
  return Math.round((weeklyCents * 52) / 12);
}
