import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// A fake key in the real Google key format. If it shows up in the browser files, the real one would too.
const CANARY_KEY = "AIzaSyCANARY_security_test_not_a_real_key";
const GOOGLE_KEY_PATTERN = /AIza[0-9A-Za-z_-]{35}/;

/** Every file under a folder, so the scan covers every script and stylesheet the browser can download. */
function allFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? allFiles(path) : [path];
  });
}

/** The real key from .env.local, if one is set, so the scan also proves the actual value never ships. */
function realKeyFromEnvFile(): string | undefined {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith("GEMINI_API_KEY="));
  const value = line?.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  return value ? value : undefined;
}

describe("production build: the Gemini key never reaches the browser", () => {
  let browserFiles: { path: string; text: string }[] = [];

  beforeAll(() => {
    // A real production build (about 15 seconds) with the fake key set, exactly as a deploy would build it.
    execFileSync("npx", ["next", "build"], {
      env: { ...process.env, NODE_ENV: "production", DEMO_MODE: "true", GEMINI_API_KEY: CANARY_KEY },
      stdio: "pipe",
      timeout: 240_000,
    });
    browserFiles = allFiles(".next/static").map((path) => ({ path, text: readFileSync(path, "latin1") }));
  }, 300_000);

  it("built the browser files", () => {
    expect(browserFiles.some((f) => f.path.endsWith(".js"))).toBe(true);
  });

  it("the key's value is not in any browser file", () => {
    expect(browserFiles.filter((f) => f.text.includes(CANARY_KEY)).map((f) => f.path)).toEqual([]);
  });

  it("no browser file contains anything shaped like a Google API key, or the key's name", () => {
    expect(browserFiles.filter((f) => GOOGLE_KEY_PATTERN.test(f.text)).map((f) => f.path)).toEqual([]);
    expect(browserFiles.filter((f) => f.text.includes("GEMINI_API_KEY")).map((f) => f.path)).toEqual([]);
  });

  it("the real key in .env.local (if any) is not in any browser file", () => {
    const realKey = realKeyFromEnvFile();
    if (!realKey) return;
    // Only file paths are reported, never the key itself.
    expect(browserFiles.filter((f) => f.text.includes(realKey)).map((f) => f.path)).toEqual([]);
  });
});
