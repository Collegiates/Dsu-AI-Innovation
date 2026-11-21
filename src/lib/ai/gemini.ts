import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { aiConfig } from "@/lib/config/app";
import { createQuotaPacer } from "./quota";

/** Why the app could not get an answer from Gemini, so the fallback can say why in the logs. */
export type AiFailureReason =
  | "demo-mode"
  | "no-key"
  | "no-model"
  | "no-fixture"
  | "timeout"
  | "rate-limited"
  | "api-error"
  | "invalid-response";

/**
 * The one error type every Gemini problem turns into. Callers catch it and use their plain-code fallback.
 * Example: a request that takes longer than 5 seconds throws AiUnavailableError with reason "timeout".
 */
export class AiUnavailableError extends Error {
  constructor(
    public readonly reason: AiFailureReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

/**
 * Says whether live Gemini calls are allowed right now, and if not, why.
 * Demo mode and a missing key both mean "use the saved answers in data/fixtures/ instead".
 * Example: with DEMO_MODE=true this returns { live: false, reason: "demo-mode" }.
 */
export function aiMode(env: Record<string, string | undefined> = process.env): { live: true } | { live: false; reason: AiFailureReason } {
  if (env.DEMO_MODE === "true") return { live: false, reason: "demo-mode" };
  if (!env.GEMINI_API_KEY) return { live: false, reason: "no-key" };
  return { live: true };
}

/** How many embedding requests run at the same time. */
const EMBED_CONCURRENCY = 4;
/** Tries per text when Gemini says "too many requests", and the wait before the next try (grows each time). */
const EMBED_MAX_ATTEMPTS = 5;
const EMBED_RETRY_MS = 8000;

// One pacer per kind of call, shared by every request this server handles.
const embedQuota = createQuotaPacer({ limit: aiConfig.embedRequestsPerMinute, windowMs: 60_000 });
const generateQuota = createQuotaPacer({ limit: aiConfig.generateRequestsPerMinute, windowMs: 60_000 });

/** Waits for a free slot under our own Gemini limit, or gives up with "rate-limited" so the caller uses its fallback. */
async function takeQuotaSlot(pacer: ReturnType<typeof createQuotaPacer>, maxWaitMs: number): Promise<void> {
  if (!(await pacer.acquire(maxWaitMs))) {
    throw new AiUnavailableError("rate-limited", "Over our own Gemini per-minute limit; using the fallback");
  }
}

let client: GoogleGenAI | undefined;
function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** Runs a Gemini call with a 5-second limit, turning every failure into an AiUnavailableError. */
async function withTimeout<T>(call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiConfig.timeoutMs);
  try {
    return await call(controller.signal);
  } catch (cause) {
    if (controller.signal.aborted) throw new AiUnavailableError("timeout", `Gemini took longer than ${aiConfig.timeoutMs} ms`, { cause });
    throw new AiUnavailableError("api-error", "Gemini request failed", { cause });
  } finally {
    clearTimeout(timer);
  }
}

const fixturesDir = () => join(process.cwd(), "data", "fixtures");

/** Saved embeddings for list text typed in the demo, so matching works offline. Keyed by the trimmed, lower-case text. */
export const QueryEmbeddingsFixtureSchema = z.object({
  model: z.string(),
  vectors: z.record(z.string(), z.array(z.number()).min(1)),
});
export const QUERY_EMBEDDINGS_FIXTURE = "query-embeddings.json";

/** Saved Gemini JSON answers keyed by a caller-chosen key (e.g. a swap id), used when live calls are off. */
export const GENERATED_FIXTURE = "generated.json";

/** The key under which a piece of list text is saved in the embeddings fixture. Example: " 2% Milk " → "2% milk". */
export const fixtureKey = (text: string) => text.trim().toLowerCase();

function readFixture(file: string): unknown | undefined {
  try {
    return JSON.parse(readFileSync(join(fixturesDir(), file), "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Turns pieces of text into embeddings: lists of numbers where similar meanings get similar numbers.
 * That lets "2 gal milk" find "2% Reduced Fat Milk" even with different words.
 * Uses Gemini when live; otherwise the saved fixture, and throws AiUnavailableError if a text isn't saved.
 * Example: embedTexts(["2% milk"]) → [[0.012, -0.03, ...]].
 * Stays under our per-minute Gemini limit: waits up to maxQuotaWaitMs for a slot, then gives up with "rate-limited".
 */
export async function embedTexts(
  texts: string[],
  purpose: "query" | "document" = "query",
  options: { maxQuotaWaitMs?: number } = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const mode = aiMode();
  if (!mode.live) {
    const fixture = QueryEmbeddingsFixtureSchema.safeParse(readFixture(QUERY_EMBEDDINGS_FIXTURE));
    if (!fixture.success) throw new AiUnavailableError("no-fixture", `No saved embeddings (${mode.reason})`);
    return texts.map((t) => {
      const key = fixtureKey(t);
      // Only the file's own entries count, so typed text like "constructor" can't pick up a built-in object property.
      const vector = Object.hasOwn(fixture.data.vectors, key) ? fixture.data.vectors[key] : undefined;
      if (!vector) throw new AiUnavailableError("no-fixture", `No saved embedding for this text (${mode.reason})`);
      return vector;
    });
  }
  const model = process.env.GEMINI_EMBED_MODEL;
  if (!model) throw new AiUnavailableError("no-model", "GEMINI_EMBED_MODEL is not set");

  // One request per text: gemini-embedding-2 merges a list of texts into a single combined vector,
  // which would break the one-vector-per-text pairing. Sent a few at a time to stay inside rate limits.
  const taskType = purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_CONCURRENCY) {
    const group = texts.slice(i, i + EMBED_CONCURRENCY);
    const results = await Promise.all(
      group.map(async (text) => {
        for (let attempt = 1; ; attempt++) {
          await takeQuotaSlot(embedQuota, options.maxQuotaWaitMs ?? aiConfig.timeoutMs);
          try {
            const response = await withTimeout((abortSignal) => gemini().models.embedContent({ model, contents: text, config: { abortSignal, taskType } }));
            return response.embeddings?.length === 1 ? (response.embeddings[0].values ?? []) : [];
          } catch (error) {
            // A 429 means "too many requests this minute": wait a moment and try again.
            const quota = (error as { cause?: { status?: number } }).cause?.status === 429;
            if (!quota || attempt >= EMBED_MAX_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, EMBED_RETRY_MS * attempt));
          }
        }
      }),
    );
    vectors.push(...results);
  }
  if (vectors.some((v) => v.length === 0)) {
    throw new AiUnavailableError("invalid-response", "Gemini returned the wrong number of embeddings");
  }
  return vectors;
}

/**
 * Asks Gemini for a JSON answer and checks it against a zod schema (a written-down description of the expected shape).
 * Anything that isn't valid JSON or doesn't fit the schema is rejected, so callers never see malformed AI output.
 * When live calls are off, it returns the saved answer for "fixtureKey" from data/fixtures/generated.json, if any.
 * Example: generateJson(prompt, z.object({ sentence: z.string() }), { fixtureKey: "swap-1" }) → { sentence: "..." }.
 */
export async function generateJson<T>(prompt: string, schema: z.ZodType<T>, options: { fixtureKey?: string } = {}): Promise<T> {
  const mode = aiMode();
  if (!mode.live) {
    const saved = z.record(z.string(), z.unknown()).safeParse(readFixture(GENERATED_FIXTURE));
    const answer = options.fixtureKey && saved.success ? saved.data[options.fixtureKey] : undefined;
    const parsed = schema.safeParse(answer);
    if (answer === undefined || !parsed.success) throw new AiUnavailableError("no-fixture", `No saved AI answer (${mode.reason})`);
    return parsed.data;
  }
  const model = process.env.GEMINI_MODEL;
  if (!model) throw new AiUnavailableError("no-model", "GEMINI_MODEL is not set");

  await takeQuotaSlot(generateQuota, aiConfig.timeoutMs);
  const response = await withTimeout((abortSignal) =>
    gemini().models.generateContent({
      model,
      contents: prompt,
      config: { abortSignal, responseMimeType: "application/json", temperature: 0.2 },
    }),
  );
  let json: unknown;
  try {
    json = JSON.parse(response.text ?? "");
  } catch (cause) {
    throw new AiUnavailableError("invalid-response", "Gemini did not return JSON", { cause });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AiUnavailableError("invalid-response", "Gemini's JSON did not match the expected shape");
  return parsed.data;
}
