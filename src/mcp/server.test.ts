import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCatalog } from "@/lib/data/load";
import { matchWithKeywords, type MatchResult } from "@/lib/matching/core";
import type { Product, Store } from "@/lib/data/schema";
import { makeProduct, makeStore } from "@/lib/trip/test-fixtures";
import { createRerouteMcpServer } from "./server";

const walmart = makeStore("walmart-dover", 0, 0);
const aldi = makeStore("aldi-dover", 4, 1);
const walmartMilk = makeProduct("walmart-dover", "2% Milk", 3.49, {
  brand: "Great Value",
  sizeValue: 1,
  sizeUnit: "gal",
  category: "dairy",
  variant: "2%",
  groupKey: "milk-2pct-1gal",
});
const aldiMilk = makeProduct("aldi-dover", "2% Milk", 2.99, {
  brand: "Friendly Farms",
  sizeValue: 1,
  sizeUnit: "gal",
  category: "dairy",
  variant: "2%",
  groupKey: "milk-2pct-1gal",
});
const catalog = parseCatalog([walmart, aldi], [walmartMilk, aldiMilk]);

let client: Client;
let server: ReturnType<typeof createRerouteMcpServer>;

async function connectMcp(overrides: { loadCatalog?: () => typeof catalog } = {}) {
  server = createRerouteMcpServer({
    loadCatalog: overrides.loadCatalog ?? (() => catalog),
    matchItems: async (items, products) => items.map((item) => matchWithKeywords(item, products)),
  });
  client = new Client({ name: "reroute-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await client?.close();
  await server?.close();
  vi.restoreAllMocks();
});

function dataOf<T>(result: unknown): T {
  return (result as { structuredContent?: T }).structuredContent as T;
}

describe("ReRoute MCP tools", () => {
  it("discovers the four read-only tools", async () => {
    await connectMcp();
    const reply = await client.listTools();
    expect(reply.tools.map((tool) => tool.name).sort()).toEqual([
      "list_stores",
      "match_grocery_items",
      "plan_grocery_trip",
      "search_catalog",
    ]);
    expect(reply.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("searches real catalog entries and returns the store price evidence", async () => {
    await connectMcp();
    const result = await client.callTool({ name: "search_catalog", arguments: { query: "friendly milk", limit: 5 } });
    const data = dataOf<{ products: (Product & { store: Store })[]; dataNote: string }>(result);
    expect(data.products).toEqual([{ ...aldiMilk, store: aldi }]);
    expect(data.dataNote).toContain("In-store prices may differ");
  });

  it("lists the commute stores with measured detours", async () => {
    await connectMcp();
    const result = await client.callTool({ name: "list_stores", arguments: {} });
    expect(dataOf<{ stores: Store[] }>(result).stores).toEqual([walmart, aldi]);
  });

  it("matches items with confidence labels and catalog alternatives", async () => {
    await connectMcp();
    const result = await client.callTool({ name: "match_grocery_items", arguments: { items: ["2% milk", "mystery item"] } });
    const matches = dataOf<{ matches: MatchResult[] }>(result).matches;
    expect(matches[0].label).toBe("Same product");
    expect(matches[0].best?.id).toBe(aldiMilk.id);
    expect(matches[1].label).toBe("No match");
    expect(matches[1].best).toBeNull();
  });

  it("plans from matched items, applies quantity and preference, and leaves unmatched items unpriced", async () => {
    await connectMcp();
    const result = await client.callTool({
      name: "plan_grocery_trip",
      arguments: { items: [{ text: "2% milk", quantity: 2 }, { text: "mystery item", quantity: 1 }], preference: "balanced" },
    });
    const data = dataOf<{
      preference: string;
      matches: { quantity: number }[];
      unmatchedItems: string[];
      trip: { recommended: { checkoutTotalCents: number; missing: unknown[] } };
      dataNote: string;
    }>(result);
    expect(data.preference).toBe("balanced");
    expect(data.matches[0].quantity).toBe(2);
    expect(data.unmatchedItems).toEqual(["mystery item"]);
    expect(data.trip.recommended.checkoutTotalCents).toBe(698);
    expect(data.trip.recommended.missing).toEqual([]);
    expect(data.dataNote).toContain("Online prices");
  });

  it("rejects invalid or oversized tool inputs", async () => {
    await connectMcp();
    const invalidPreference = await client.callTool({
      name: "plan_grocery_trip",
      arguments: { items: [{ text: "milk" }], preference: "cheapest" },
    });
    const tooManyItems = await client.callTool({
      name: "match_grocery_items",
      arguments: { items: Array.from({ length: 101 }, () => "milk") },
    });
    const tooLongQuery = await client.callTool({ name: "search_catalog", arguments: { query: "x".repeat(101) } });
    const unknownField = await client.callTool({ name: "list_stores", arguments: { includeHidden: true } });
    expect(invalidPreference.isError).toBe(true);
    expect(tooManyItems.isError).toBe(true);
    expect(tooLongQuery.isError).toBe(true);
    expect(unknownField.isError).toBe(true);
  });

  it("returns a calm tool error if the local catalog cannot be loaded", async () => {
    await connectMcp({ loadCatalog: () => { throw new Error("private file path should not escape"); } });
    const result = await client.callTool({ name: "list_stores", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "ReRoute store data is unavailable. Check the local data files and try again." }]);
  });
});
