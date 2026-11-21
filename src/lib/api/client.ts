import { GENERIC_ERRORS } from "./http";

/**
 * Sends JSON to one of the app's own API routes from the browser and returns the reply, or a short message to show.
 * It never throws, so a page can always fall back to a calm error state. Example: postJson("/api/match", { items }).
 */
export async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.status === 429) return { ok: false, message: GENERIC_ERRORS.tooMany };
    if (!response.ok) return { ok: false, message: GENERIC_ERRORS.server };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, message: "Couldn't reach the app's server. Check that it is running and try again." };
  }
}
