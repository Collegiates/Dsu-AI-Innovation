import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Every source file under src/ (tests included), so code added later is checked too. */
function sourceFiles(dir = "src"): { path: string; text: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|jsx)$/.test(name) ? [{ path, text: readFileSync(path, "utf8") }] : [];
  });
}

describe("source code: no ways to run injected HTML or code", () => {
  const files = sourceFiles();

  it("never uses dangerouslySetInnerHTML, so AI text and list text are always shown as plain text", () => {
    expect(files.filter((f) => f.text.includes("dangerouslySetInnerHTML")).map((f) => f.path)).toEqual([]);
  });

  it("never uses eval() or new Function(), which would run text as code", () => {
    expect(files.filter((f) => /\beval\s*\(|new\s+Function\s*\(/.test(f.text)).map((f) => f.path)).toEqual([]);
  });

  it("never writes raw HTML with innerHTML or outerHTML", () => {
    expect(files.filter((f) => /\.(inner|outer)HTML\s*=/.test(f.text)).map((f) => f.path)).toEqual([]);
  });
});
