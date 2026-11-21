import { postJson } from "@/lib/api/client";

/** Where receipt items came from, as the receipt route reports it. */
export type ReceiptSource = "ai" | "text" | "demo-sample";

/** What the app says about where receipt items came from, so sample data is never mistaken for a real reading. */
export const RECEIPT_NOTES: Record<ReceiptSource, string> = {
  ai: "Items read from your receipt by AI. Check them on My List.",
  text: "Items read from your receipt text.",
  "demo-sample": "Demo: receipt uploaded. James's sample grocery list is used for the plan.",
};

/** Turns a file into base64 text (letters and digits only) so it can be sent as JSON. */
async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Sends a receipt (text file, photo or PDF) to the receipt route and returns the item names and where they came from.
 * Example: await uploadReceipt(pdfFile) → { ok: true, data: { source: "demo-sample", items: ["2% milk", ...] } }.
 */
export async function uploadReceipt(file: File) {
  const isText = file.type.startsWith("text/") || file.name.endsWith(".txt");
  const body = isText
    ? { kind: "text", text: (await file.text()).slice(0, 10_000) }
    : { kind: "image", mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"), data: await toBase64(file) };
  return postJson<{ source: ReceiptSource; items: string[] }>("/api/receipt", body);
}
