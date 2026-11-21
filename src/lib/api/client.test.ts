import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("postJson", () => {
  it("returns the reply on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ results: [1] })));
    expect(await postJson("/api/match", { items: ["milk"] })).toEqual({ ok: true, data: { results: [1] } });
  });

  it("turns rate limits, server errors and network failures into short messages instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    expect(await postJson("/x", {})).toMatchObject({ ok: false, message: expect.stringMatching(/too many/i) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("stack trace", { status: 500 })));
    expect(await postJson("/x", {})).toEqual({ ok: false, message: "Something went wrong. Please try again." });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await postJson("/x", {})).toMatchObject({ ok: false, message: expect.stringMatching(/couldn't reach/i) });
  });
});
