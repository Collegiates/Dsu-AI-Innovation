# AI Validation

Every place AI is used, how its output is checked, and the latest eval accuracy.

**Rule:** code does the math, AI does the language. AI never produces a number the user sees unless code has checked it.

## Where AI is used

| Use | AI does | Code checks | If AI fails or is off |
|---|---|---|---|
| List matching (`src/lib/matching/`) | Gemini embeddings place list text and products by meaning | Code takes the 5 closest products, keeps only the top product's category, separates variants, sorts by unit price, and labels the match by a similarity threshold (`aiConfig` in `src/lib/config/app.ts`): ≥ 0.80 "Same product", ≥ 0.60 "Similar", otherwise "No match" | Keyword matching (word overlap, small typos allowed) |
| Swap explanations (`src/lib/ai/explainSwap.ts`) | Gemini writes one sentence from code-computed facts | `validateSwapExplanation` in `src/lib/ai/validators.ts`: JSON shape (zod), ≤ 25 words, every $ amount / cents / "dollars" must equal a computed price or saving, every % must equal the computed percentage, no catalog brand or store chain outside the facts, no HTML | Template sentence filled in by code |
| Product grouping | Not used: group keys were typed by hand in `data/raw/products.csv` (Phase 2 step 3 skipped for time) | — | — |

All Gemini calls go through `src/lib/ai/gemini.ts` (`import "server-only"`), have a 5-second timeout, and must return JSON that passes a zod schema. With `DEMO_MODE=true` or no key, saved answers in `data/fixtures/` are used, and if none exist the non-AI fallback runs. Every fallback is logged with its reason.

**Prompt injection:** the shopper's typed text is never put into a prompt. Matching only embeds it (turns it into numbers) or compares words. Swap prompts contain only catalog facts, inside `<facts>` markers. AI text is shown as plain text, never HTML.

## Eval

`npm run eval` runs `tests/ai-eval/matching.eval.test.ts` against `tests/ai-eval/golden-matches.json` (26 messy inputs: typos, vague items, a non-grocery item, a grocery item the stores don't carry, and a prompt-injection line). It fails below 90%.

- Mode is chosen automatically: live Gemini with `EVAL_LIVE=true`, saved embeddings when `data/embeddings.json` and the query fixtures exist, otherwise the keyword fallback.
- Vague inputs ("the cheap bread", "paper towels", "laundry detergent", "creamy peanut butter") accept any of the listed equally-right groups.

**Latest result (Nov 21, 2026): 100% (26/26), keyword fallback mode, on the 55 real products.** Embedding mode has not been measured yet because there is no Gemini key; run `npm run build-embeddings` then `EVAL_LIVE=true npm run eval` once the key is in `.env.local`, and tune the thresholds if needed.

Honesty note: the golden set was written while the keyword matcher was being built, so the keyword score is optimistic. The embedding score, once measured, is the more independent check.
