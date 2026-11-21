# Backup slides

Four backup slides as plain text, ready to paste into the deck.

---

## Slide 1: How we keep the AI honest

**Code does the math. AI does the words.**

- Prices, totals, savings, the trip: plain TypeScript with unit tests. Never AI.
- AI job 1, reading messy lists: embeddings find candidates; code filters by category and variant and compares unit prices. A low score is labeled "Similar" or "No match".
- AI job 2, one-sentence swap explanations: every $ and % must equal the code's number. A wrong number, outside brand, HTML or more than 25 words → a template sentence.
- Golden test set: 27 messy inputs (typos, vague items, prompt injection) → **100% accuracy** (fails below 90%).
- Gemini down or no wifi: 5-second timeout → keyword matching, template text, saved FDA data.

---

## Slide 2: Testing & regression

**249 automated checks + 16 end-to-end journeys, all passing**

- `npm run check` before every commit: typecheck, lint, unit, AI eval, security.
- Playwright clicks through the real app at 1440×900, including the full demo with the internet blocked.
- Every bug fix starts with a failing `regression:` test (6 so far). Examples:
  - "rice" matched rice cereal.
  - Plain yogurt was swapped for vanilla.
  - The demo login landed on a missing page.
- `npm run report` prints the counts per feature (screenshot this output).

---

## Slide 3: Security

- API key server-only: a test builds the app with a fake key and scans every browser file for it.
- Every API input is checked (zod): max 100 items × 100 characters. Bad input gets a generic message, never a stack trace.
- Request bodies are capped while reading (fixed in our security review, with a regression test).
- Rate limit: 30 AI requests per minute per visitor.
- Typed text never enters an AI prompt. No raw HTML anywhere (a test checks).
- Security headers: Content-Security-Policy, no framing, nosniff, referrer policy.
- No accounts and no server database. Preferences stay in the browser.
- `npm audit`: 0 high, 0 critical.

---

## Slide 4: Architecture

```
[ Browser: Next.js pages ]
  Landing · Dashboard · My List · Trip Plan · Smart Swaps · Deal Watch · Recalls · Settings
  saved list / hidden brands / waitlist → localStorage (checked with zod)
        │
        ▼
[ API routes: /api/match · /api/swaps · /api/recalls ]
  zod input checks · rate limit · generic errors
        │
        ├──► [ Matching ]   embeddings (Gemini) → code filters → unit prices   | fallback: keywords
        ├──► [ Swaps ]      code picks + computes savings → Gemini sentence → validator | fallback: template
        └──► [ Recalls ]    openFDA (5 s timeout) → brand + word rule           | fallback: saved FDA copy

[ Pure code, no AI ]  trip optimizer · pricing · Deal Watch price-drop detection
[ Data ]  data/raw/*.csv → npm run import-data → stores.json, products.json   ·   data/fixtures/ (offline demo)
```
