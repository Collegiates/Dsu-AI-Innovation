import type { z } from "zod";

/** The messages API routes send back. They are deliberately generic so they never reveal how the app works inside. */
export const GENERIC_ERRORS = {
  invalid: "Invalid request.",
  tooMany: "Too many requests. Please wait a minute and try again.",
  server: "Something went wrong. Please try again.",
} as const;

// Requests bigger than this are refused before being read as JSON (100 items × 100 characters fits easily).
const MAX_BODY_CHARS = 50_000;

/** Sends a JSON response with a status code. Example: json({ error: "Invalid request." }, 400). */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * Reads and checks a request body against a zod schema (a written description of the allowed shape and limits).
 * Returns the checked data, or a ready-made 400 response if the body is too big, not JSON, or doesn't fit.
 * Example: a list with 101 items → { ok: false, response: 400 "Invalid request." }.
 */
export async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const invalid = { ok: false as const, response: json({ error: GENERIC_ERRORS.invalid }, 400) };
  // A declared size over the limit is refused before reading anything.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_CHARS) return invalid;
  const text = await readTextUpTo(request, MAX_BODY_CHARS);
  if (text === null) return invalid;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return invalid;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : invalid;
}

/**
 * Reads a request body piece by piece and stops as soon as it passes the limit, so a huge or endless body
 * is never held in memory. Returns null if the body is too big or can't be read.
 */
async function readTextUpTo(request: Request, maxChars: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      text += decoder.decode(value, { stream: true });
      if (text.length > maxChars) {
        await reader.cancel().catch(() => {});
        return null;
      }
    }
  } catch {
    return null;
  }
}
