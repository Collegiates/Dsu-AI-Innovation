# Security

Each security measure in the app and the test that proves it.

| Measure | Where | Test |
|---|---|---|
| Security headers (CSP, frame-ancestors 'none', nosniff, Referrer-Policy) | `next.config.ts` | `tests/security/headers.test.ts`, `tests/e2e/smoke.spec.ts` |
| Secrets only in `.env.local` (git-ignored); `.env.example` has empty values | `.gitignore`, `.env.example` | `tests/security/secrets.test.ts` |
| Gemini key never reaches the browser: only `src/lib/ai/gemini.ts` reads it, and it starts with `import "server-only"`; no `NEXT_PUBLIC_` key; no client component imports AI code | `src/lib/ai/gemini.ts` | `tests/security/gemini-key.test.ts` |
| API input validated with zod: max 100 items, max 100 characters each, no unknown fields, body size capped | `src/lib/api/schemas.ts`, `src/lib/api/http.ts` | `tests/security/api-routes.test.ts` |
| Generic error messages, never stack traces or file paths | `src/lib/api/http.ts`, API routes | `tests/security/api-routes.test.ts` |
| Rate limit: 30 requests/minute per address on AI routes | `src/lib/ai/rate-limit.ts` | `src/lib/ai/rate-limit.test.ts`, `tests/security/api-routes.test.ts` |
| 5-second timeout on Gemini, with fallback | `src/lib/ai/gemini.ts` | `src/lib/ai/explainSwap.test.ts` (timeout → template) |
| Prompt injection: typed text never enters a prompt; treated as a plain list item | `src/lib/matching/`, `src/lib/ai/explainSwap.ts` | `src/lib/matching/core.test.ts`, `tests/security/api-routes.test.ts`, golden set |
| AI text checked before display (amounts, names, HTML, length) | `src/lib/ai/validators.ts` | `src/lib/ai/validators.test.ts` |
| openFDA calls: fixed URL (no user input in the query), 5-second timeout, response checked with zod, malformed records skipped, fixture fallback | `src/lib/recalls/openfda.ts`, `src/lib/recalls/schema.ts` | `src/lib/recalls/openfda.test.ts`, `src/lib/recalls/schema.test.ts` |
| Browser storage holds only non-sensitive settings, validated on read and write; corrupted values fall back to defaults | `src/lib/preferences/storage.ts` | `src/lib/preferences/storage.test.ts` |
| `npm audit`: no high or critical issues (4 moderate, inside the shadcn CLI) | — | run `npm audit` |

## Security review (Phase 2)

`/security-review` on the AI layer and API routes found no exploitable issues. Follow-ups:

- **Fixed:** typed text such as `constructor` could look up a built-in object property in the saved-embeddings fixture (harmless: it produced a wrong match, not a crash). Now only the file's own entries are used. Test: `regression: list text like 'constructor' or '__proto__' is not found in the saved embeddings` in `src/lib/ai/gemini.test.ts`.
- **Known limit:** the rate limiter identifies visitors by the `x-forwarded-for` header, which a client can set. That is fine for a local demo; behind a real host (e.g. Vercel), use the platform's verified client IP instead.

## Security review (Phase 3)

`/security-review` on recalls, Deal Watch and saved preferences found no exploitable issues: the openFDA address is fixed (only server-computed dates vary), no request value reaches a file path, and responses expose no internal details.
