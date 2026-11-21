# AI Validation

Every place AI is used, how its output is checked, and the latest eval accuracy.

**Rule:** code does the math, AI does the language. AI never produces a number the user sees unless code has checked it.

**Why AI never does the math:** language models can write a confident wrong number, and a wrong price or saving would break the app's one promise. So every price, unit price, total, saving, percentage and trip choice is computed in plain TypeScript with unit tests, and the AI only gets those numbers as facts to repeat. If it changes one, the sentence is thrown away.

**Checks applied to every AI answer:**

| Check | Matching (embeddings) | Swap explanations |
|---|---|---|
| Schema (zod) | Response must have one vector per text, none empty | Must be JSON `{ "sentence": "..." }` |
| Catalog ID check | The AI returns no IDs: code computes similarity against catalog products only, so a non-catalog product can't appear | The AI picks nothing: code chooses the swap; the sentence may not name a brand or store outside the facts |
| Number check | No numbers from AI reach the user (similarity only decides the label) | Every $ amount and % must equal a computed value |
| Fallback | Keyword matching | Template sentence |

## Where AI is used

| Use | AI does | Code checks | If AI fails or is off |
|---|---|---|---|
| List matching (`src/lib/matching/`) | Gemini embeddings place list text and products by meaning | Code takes the 5 closest products, keeps only the top product's category, separates variants, sorts by unit price, and labels the match by a similarity threshold (`aiConfig` in `src/lib/config/app.ts`): ≥ 0.80 "Same product", ≥ 0.66 "Similar", otherwise "No match". Saved embeddings are used only if they cover the whole catalog | Keyword matching (word overlap, small typos allowed) |
| Swap explanations (`src/lib/ai/explainSwap.ts`) | Gemini writes one sentence from code-computed facts | `validateSwapExplanation` in `src/lib/ai/validators.ts`: JSON shape (zod), ≤ 25 words, every $ amount / cents / "dollars" must equal a computed price or saving, every % must equal the computed percentage, no catalog brand or store chain outside the facts, no HTML | Template sentence filled in by code |
| Product grouping | Not used: group keys were typed by hand in `data/raw/products.csv` (Phase 2 step 3 skipped for time) | — | — |

All Gemini calls go through `src/lib/ai/gemini.ts` (`import "server-only"`), have a 5-second timeout, and must return JSON that passes a zod schema. With `DEMO_MODE=true` or no key, saved answers in `data/fixtures/` are used, and if none exist the non-AI fallback runs. Every fallback is logged with its reason.

**Prompt injection:** the shopper's typed text is never put into a prompt. Matching only embeds it (turns it into numbers) or compares words. Swap prompts contain only catalog facts, inside `<facts>` markers. AI text is shown as plain text, never HTML.

## Eval

`npm run eval` runs `tests/ai-eval/matching.eval.test.ts` against `tests/ai-eval/golden-matches.json` (37 messy inputs: typos, vague items, non-grocery items, grocery items the stores don't carry, and a prompt-injection line). It fails below 90%.

- Mode is chosen automatically: live Gemini with `EVAL_LIVE=true`, saved embeddings when `data/embeddings.json` and the query fixtures exist, otherwise the keyword fallback.
- Vague inputs ("the cheap bread", "paper towels", "laundry detergent", "creamy peanut butter") accept any of the listed equally-right groups.

**Latest result (Nov 21, 2026), on the 55 real products:**

| Mode | Accuracy |
|---|---|
| Live Gemini embeddings (`gemini-embedding-001`, `EVAL_LIVE=true`) | 100% (37/37) |
| Saved embeddings (default `npm run eval`, works offline) | 100% (37/37) |
| Keyword fallback (no embeddings) | 100% (37/37) |

How the "Similar" cutoff was chosen: the first embedding run scored **88.9% (24/27)** with the old 0.60 cutoff. Every product match was right, but "lawn mower", "honeycrisp apples" and the prompt-injection line scored 0.60–0.64 and were wrongly labeled "Similar", while real matches scored 0.68–0.79. The cutoff was raised to 0.66 (between the two groups). Then 10 new inputs were added that the cutoff had never seen (4 that should match, 6 that shouldn't). All 10 came out right: matches 0.69–0.75, non-matches 0.59–0.63.

Honesty notes:
- The keyword golden set was written while the keyword matcher was being built, so the keyword score is optimistic.
- The gap between "match" and "no match" with embeddings is narrow (about 0.04 on each side of 0.66). Low-confidence matches are labeled "Similar", never "Same product".
- With `gemini-embedding-001`, no input reaches 0.80, so embedding matches currently show "Similar", not "Same product". The 0.80 cutoff has not been re-tuned, because 37 cases are too few to pick it fairly.
- Each embedding model scores on its own scale: after changing `GEMINI_EMBED_MODEL`, run `npm run build-embeddings` and `npm run eval` again.
