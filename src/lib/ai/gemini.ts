import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { aiConfig } from "@/lib/config/app";

/** Why the app could not get an answer from Gemini, so the fallback can say why in the logs. */
export type AiFailureReason =
  | "demo-mode"
  | "no-key"
  | "no-model"
  | "no-fixture"
  | "timeout"
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
 */
export async function embedTexts(texts: string[], purpose: "query" | "document" = "query"): Promise<number[][]> {
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

  const response = await withTimeout((abortSignal) =>
    gemini().models.embedContent({
      model,
      contents: texts,
      config: { abortSignal, taskType: purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT" },
    }),
  );
  const vectors = (response.embeddings ?? []).map((e) => e.values ?? []);
  if (vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
    throw new AiUnavailableError("invalid-response", "Gemini returned the wrong number of embeddings");
  }
  return vectors;
}

/**
 * Asks Gemini for a JSON answer and checks it against a zod schema (a written-down description of the expected shape).
 * Anything that isn't valid JSON or doesn't fit the schema is rejected, so callers never see malformed AI output.
 * When live calls are off, it returns the saved answer for "fixtureKey" from data/fixtures/generated.json, if any.
 * An optional image (e.g. a receipt photo, as base64) is sent along with the prompt.
 * Example: generateJson(prompt, z.object({ sentence: z.string() }), { fixtureKey: "swap-1" }) → { sentence: "..." }.
 */
export async function generateJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: { fixtureKey?: string; image?: { mimeType: string; data: string } } = {},
): Promise<T> {
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

  const response = await withTimeout((abortSignal) =>
    gemini().models.generateContent({
      model,
      contents: options.image ? [{ role: "user", parts: [{ text: prompt }, { inlineData: options.image }] }] : prompt,
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
