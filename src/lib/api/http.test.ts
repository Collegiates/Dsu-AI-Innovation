import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readBody } from "./http";

const Schema = z.object({ items: z.array(z.string()) }).strict();
const req = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api", { method: "POST", body, headers: { "content-type": "application/json", ...headers }, duplex: "half" } as RequestInit);

/** A request body that never ends, like a client streaming garbage forever. */
function endlessBody(): ReadableStream<Uint8Array> {
  const chunk = new TextEncoder().encode("x".repeat(10_000));
  return new ReadableStream({ pull: (controller) => controller.enqueue(chunk) });
}

describe("readBody", () => {
  it("returns the checked data for a valid body", async () => {
    expect(await readBody(req(JSON.stringify({ items: ["milk"] })), Schema)).toEqual({ ok: true, data: { items: ["milk"] } });
  });

  it("rejects bad JSON and bodies that don't fit the schema with a 400", async () => {
    for (const body of ["{nope", JSON.stringify({ items: "milk" }), JSON.stringify({ items: [], extra: 1 })]) {
      const result = await readBody(req(body), Schema);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(400);
    }
  });

  it("rejects a body over 50,000 characters", async () => {
    const result = await readBody(req(JSON.stringify({ items: ["x".repeat(60_000)] })), Schema);
    expect(result.ok).toBe(false);
  });

  it("regression: a huge request body was read into memory in full before the size check", async () => {
    // Before the fix this never finished, because the whole endless body was read first.
    const result = await readBody(req(endlessBody()), Schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(await result.response.json()).toEqual({ error: "Invalid request." });
  }, 2_000);

  it("rejects a declared Content-Length over the limit without reading the body", async () => {
    const result = await readBody(req(endlessBody(), { "content-length": "999999999" }), Schema);
    expect(result.ok).toBe(false);
  }, 2_000);
});
