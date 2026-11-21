import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Asks git whether it would ignore a file path (true = the file can never be committed by accident). */
function isGitIgnored(path: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", path]);
    return true;
  } catch {
    return false;
  }
}

describe("secrets", () => {
  it("keeps .env.local and other local env files out of git", () => {
    expect(isGitIgnored(".env.local")).toBe(true);
    expect(isGitIgnored(".env.development.local")).toBe(true);
  });

  it("commits .env.example so teammates know which settings exist", () => {
    expect(isGitIgnored(".env.example")).toBe(false);
  });

  it("leaves every secret in .env.example empty", () => {
    const example = readFileSync(".env.example", "utf8");
    for (const key of ["GEMINI_API_KEY", "GEMINI_MODEL", "GEMINI_EMBED_MODEL"]) {
      expect(example).toMatch(new RegExp(`^${key}=$`, "m"));
    }
  });
});
