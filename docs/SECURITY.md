# Security

Each security measure in the app and the test that proves it.

| Measure | Where | Test |
|---|---|---|
| Security headers (CSP, frame-ancestors 'none', nosniff, Referrer-Policy) | `next.config.ts` | `tests/security/headers.test.ts`, `tests/e2e/smoke.spec.ts` |
| Secrets only in `.env.local` (git-ignored); `.env.example` has empty values | `.gitignore`, `.env.example` | `tests/security/secrets.test.ts` |
| Gemini key never reaches the browser: only `src/lib/ai/gemini.ts` reads it, and it starts with `import "server-only"`; no `NEXT_PUBLIC_` key; no client component imports AI code | `src/lib/ai/gemini.ts` | `tests/security/gemini-key.test.ts` |
| A real production build with a fake key: neither its value, the key's name, anything shaped like a Google key, nor the real `.env.local` key appears in `.next/static` | `src/lib/ai/gemini.ts`, `next.config.ts` | `tests/security/bundle.test.ts` |
| No `dangerouslySetInnerHTML`, `eval`, `new Function` or `innerHTML =` anywhere in `src/` | all of `src/` | `tests/security/source-code.test.ts` |
| API input validated with zod: max 100 items, max 100 characters each (101 and 500 rejected), wrong types and unknown fields rejected, body size capped while reading (an oversized or endless body is never held in memory) | `src/lib/api/schemas.ts`, `src/lib/api/http.ts` | `tests/security/api-routes.test.ts`, `src/lib/api/http.test.ts` |
| Generic error messages, never stack traces or file paths | `src/lib/api/http.ts`, API routes | `tests/security/api-routes.test.ts` |
| Rate limit: 30 requests/minute per address on AI routes | `src/lib/ai/rate-limit.ts` | `src/lib/ai/rate-limit.test.ts`, `tests/security/api-routes.test.ts` |
| Our own outgoing Gemini limit: at most 90 embedding and 10 text calls per minute, under Google's free-tier quota. A page request over the limit falls back to plain code at once instead of waiting; a "quota exceeded" (429) answer is retried with a growing wait | `src/lib/ai/quota.ts`, `src/lib/ai/gemini.ts`, limits in `aiConfig` | `src/lib/ai/quota.test.ts`, `src/lib/ai/gemini.embed.test.ts` |
| MCP tools are read-only, validate bounded inputs, return generic failures, and run on stdio behind OpenAI Secure MCP Tunnel; no public listener or tunnel credentials are stored in the repository | `src/mcp/server.ts`, `scripts/mcp-server.ts`, `docs/MCP_CONNECTOR.md` | `src/mcp/server.test.ts` |
| 5-second timeout on Gemini, with fallback | `src/lib/ai/gemini.ts` | `src/lib/ai/explainSwap.test.ts` (timeout → template) |
| Prompt injection: typed text never enters a prompt; treated as a plain list item | `src/lib/matching/`, `src/lib/ai/explainSwap.ts` | `src/lib/matching/core.test.ts`, `tests/security/api-routes.test.ts`, golden set |
| AI text checked before display (amounts, names, HTML, length) | `src/lib/ai/validators.ts` | `src/lib/ai/validators.test.ts` |
| openFDA calls: fixed URL (no user input in the query), 5-second timeout, response checked with zod, malformed records skipped, fixture fallback | `src/lib/recalls/openfda.ts`, `src/lib/recalls/schema.ts` | `src/lib/recalls/openfda.test.ts`, `src/lib/recalls/schema.test.ts` |
| Browser storage holds only non-sensitive settings, validated on read and write; corrupted values fall back to defaults | `src/lib/preferences/storage.ts` | `src/lib/preferences/storage.test.ts` |
| Demo login stores only the word "true" under `grocerysave:demo`: no name, password or personal data. It is a demo switch, not access control (there is no private data behind it) | `src/lib/auth/demo.ts` | `src/lib/auth/demo.test.ts` |
| `npm audit` (Nov 21, 2026): 0 high, 0 critical; 4 moderate, all inside the shadcn CLI (a dev tool, not shipped to the browser) | — | run `npm audit` |
| Works offline: the demo journey passes with every non-localhost request blocked | `DEMO_MODE`, `data/fixtures/` | `tests/e2e/demo-journey.spec.ts` |

## Security review (Phase 2)

`/security-review` on the AI layer and API routes found no exploitable issues. Follow-ups:

- **Fixed:** typed text such as `constructor` could look up a built-in object property in the saved-embeddings fixture (harmless: it produced a wrong match, not a crash). Now only the file's own entries are used. Test: `regression: list text like 'constructor' or '__proto__' is not found in the saved embeddings` in `src/lib/ai/gemini.test.ts`.
- **Known limit:** the rate limiter identifies visitors by the `x-forwarded-for` header, which a client can set. That is fine for a local demo; behind a real host (e.g. Vercel), use the platform's verified client IP instead.

## Security review (Phase 3)

`/security-review` on recalls, Deal Watch and saved preferences found no exploitable issues: the openFDA address is fixed (only server-computed dates vary), no request value reaches a file path, and responses expose no internal details.

## Landing page and demo login (Phase 4)

No API route or AI call was added. The landing page renders only fixed text (no user input, no `dangerouslySetInnerHTML`), the store logos are inline vectors (no outside requests, so the CSP is unchanged), and the demo flag holds no personal data.

## Security review (Phase 6, whole project)

Reviewed the three API routes, request reading, rate limiting, the Gemini and openFDA clients, saved preferences and the demo login.

- **Fixed:** `readBody` read the whole request body into memory before checking the 50,000-character limit, so a huge or endless body could use up the server's memory. It now refuses a declared `Content-Length` over the limit and stops reading as soon as the body passes it. Test: `regression: a huge request body was read into memory in full before the size check` in `src/lib/api/http.test.ts`.
- **No issue:** product IDs are looked up in a `Map` (no prototype tricks); the openFDA address is fixed; AI text is plain text; errors are generic.
- **Known limit (unchanged):** the rate limiter trusts `x-forwarded-for`. Fine locally; behind a host that sets it (Vercel does), it is the real client address.
