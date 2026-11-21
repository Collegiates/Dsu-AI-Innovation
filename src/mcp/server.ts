import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DATA_SOURCE_NOTE } from "@/lib/config/app";
import { loadCatalog, type Catalog } from "@/lib/data/load";
import { matchList } from "@/lib/matching/match";
import { entriesFromMatches, basketFromEntries } from "@/lib/list/list";
import { DEFAULT_USUAL_STORE_ID, optimizeTrip } from "@/lib/trip/optimizer";
import type { MatchResult } from "@/lib/matching/core";
import { z } from "zod";

const MAX_ITEMS = 100;
const MAX_ITEM_CHARS = 100;
const MAX_QUANTITY = 20;
const TripPreferenceSchema = z.enum(["fastest", "balanced", "maxSavings"]);

type McpDependencies = {
  loadCatalog: () => Catalog;
  matchItems: (items: string[], products: Catalog["products"]) => Promise<MatchResult[]>;
};

const defaultDependencies: McpDependencies = { loadCatalog, matchItems: matchList };

function success(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function failure(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/**
 * Creates the ReRoute MCP server and its read-only grocery tools.
 * Example: a ChatGPT client can search real catalog items, match a list, and price a trip without changing saved data.
 */
export function createRerouteMcpServer(dependencies: McpDependencies = defaultDependencies): McpServer {
  const server = new McpServer({ name: "reroute", version: "1.0.0" });

  server.registerTool(
    "search_catalog",
    {
      title: "Search ReRoute catalog",
      description: "Search ReRoute's checked store catalog by product text, store, or category. Returns observed product and price data.",
      inputSchema: z.strictObject({
        query: z.string().trim().max(MAX_ITEM_CHARS).optional().describe("Words to find in a product name, brand, category, variant, or store name."),
        storeId: z.string().trim().min(1).max(100).optional().describe("Optional store id to filter by."),
        category: z.string().trim().min(1).max(100).optional().describe("Optional exact product category to filter by."),
        limit: z.number().int().min(1).max(50).default(10).describe("Maximum products to return; defaults to 10."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, storeId, category, limit }) => {
      try {
        const catalog = dependencies.loadCatalog();
        const terms = query?.toLocaleLowerCase().split(/\s+/).filter(Boolean) ?? [];
        const storesById = new Map(catalog.stores.map((store) => [store.id, store]));
        const products = catalog.products
          .filter((product) => !storeId || product.storeId === storeId)
          .filter((product) => !category || product.category.toLocaleLowerCase() === category.toLocaleLowerCase())
          .filter((product) => {
            if (terms.length === 0) return true;
            const store = storesById.get(product.storeId);
            const text = `${product.brand} ${product.name} ${product.category} ${product.variant} ${store?.chain ?? ""} ${store?.name ?? ""}`.toLocaleLowerCase();
            return terms.every((term) => text.includes(term));
          })
          .sort((a, b) => a.name.localeCompare(b.name) || a.storeId.localeCompare(b.storeId) || a.id.localeCompare(b.id))
          .slice(0, limit);
        return success({
          products: products.map((product) => ({ ...product, store: storesById.get(product.storeId) ?? null })),
          dataNote: DATA_SOURCE_NOTE,
        });
      } catch {
        return failure("ReRoute catalog is unavailable. Check the local data files and try again.");
      }
    },
  );

  server.registerTool(
    "list_stores",
    {
      title: "List ReRoute stores",
      description: "List stores on the ReRoute commute with their measured detour times and distances.",
      inputSchema: z.strictObject({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const { stores } = dependencies.loadCatalog();
        return success({ stores, dataNote: DATA_SOURCE_NOTE });
      } catch {
        return failure("ReRoute store data is unavailable. Check the local data files and try again.");
      }
    },
  );

  server.registerTool(
    "match_grocery_items",
    {
      title: "Match grocery items",
      description: "Match each grocery item to real catalog products. Results include a confidence label; 'Similar' should be checked by the shopper.",
      inputSchema: z.strictObject({
        items: z.array(z.string().trim().min(1).max(MAX_ITEM_CHARS)).min(1).max(MAX_ITEMS).describe("One grocery item per string, up to 100 items."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ items }) => {
      try {
        const catalog = dependencies.loadCatalog();
        const matches = await dependencies.matchItems(items, catalog.products);
        return success({ matches, dataNote: DATA_SOURCE_NOTE });
      } catch {
        return failure("ReRoute could not match those items. Try again; no grocery data was changed.");
      }
    },
  );

  server.registerTool(
    "plan_grocery_trip",
    {
      title: "Plan a ReRoute grocery trip",
      description: "Match the supplied grocery list and use ReRoute's checked price and detour calculations to plan stops. Every item quantity is packages of the matched usual-store product. The preference is required.",
      inputSchema: z.strictObject({
        items: z
          .array(z.strictObject({ text: z.string().trim().min(1).max(MAX_ITEM_CHARS), quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1) }))
          .min(1)
          .max(MAX_ITEMS)
          .describe("Grocery list lines and package quantities."),
        preference: TripPreferenceSchema.describe("How to trade money against extra time: fastest, balanced, or maxSavings."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ items, preference }) => {
      try {
        const catalog = dependencies.loadCatalog();
        const matches = await dependencies.matchItems(items.map((item) => item.text), catalog.products);
        const entries = entriesFromMatches(matches, DEFAULT_USUAL_STORE_ID).map((entry, index) => ({
          ...entry,
          quantity: items[index].quantity,
        }));
        const { basket, entryIndexes, unmatched } = basketFromEntries(entries, catalog.productsById);
        const trip = optimizeTrip({ basket, products: catalog.products, stores: catalog.stores, preference, usualStoreId: DEFAULT_USUAL_STORE_ID });
        const missingFromTrip = trip.recommended.missing.map((missing) => ({
          item: entries[entryIndexes[missing.basketIndex]]?.text ?? missing.label,
          productId: missing.usualProductId,
          reason: "No compatible product is sold at the selected stores; this item is not priced.",
        }));
        return success({
          preference,
          matches: matches.map((match, index) => ({
            input: match.input,
            confidence: match.label,
            selectedProductId: entries[index].productId,
            quantity: entries[index].quantity,
          })),
          unmatchedItems: unmatched,
          missingFromRecommendedTrip: missingFromTrip,
          trip,
          dataNote: DATA_SOURCE_NOTE,
        });
      } catch {
        return failure("ReRoute could not plan that trip. Check the local catalog and try again; no grocery data was changed.");
      }
    },
  );

  return server;
}
