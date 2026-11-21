import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Every source file under src/, so the checks below cover code added later too. */
function sourceFiles(dir = "src"): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("Gemini key stays on the server", () => {
  const files = sourceFiles().map((path) => ({ path, text: readFileSync(path, "utf8") }));

  it("the Gemini client starts with import \"server-only\", so Next.js refuses to bundle it for the browser", () => {
    const gemini = readFileSync("src/lib/ai/gemini.ts", "utf8");
    expect(gemini.trimStart().startsWith('import "server-only";')).toBe(true);
  });

  it("only the server-only Gemini client reads the key", () => {
    const readers = files.filter((f) => f.text.includes("GEMINI_API_KEY")).map((f) => f.path);
    expect(readers).toEqual(["src/lib/ai/gemini.ts"]);
  });

  it("no file exposes the key to the browser with a NEXT_PUBLIC_ name", () => {
    expect(files.filter((f) => /NEXT_PUBLIC_GEMINI/.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("no browser component imports the Gemini client", () => {
    const clientFiles = files.filter((f) => /^\s*["']use client["']/.test(f.text));
    const offenders = clientFiles.filter((f) => /@\/lib\/ai\/(gemini|explainSwap)|@\/lib\/matching\/match/.test(f.text)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("files that call Gemini are server-only", () => {
    const callers = files.filter((f) => /from "@\/lib\/ai\/gemini"|from "\.\/gemini"/.test(f.text)).map((f) => f);
    for (const f of callers) expect(f.text.trimStart().startsWith('import "server-only";'), f.path).toBe(true);
  });
});
