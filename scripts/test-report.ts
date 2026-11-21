/**
 * Prints a one-screen summary judges can read: how many tests exist per folder, how many pass,
 * which regression tests exist, how many end-to-end journeys there are, and the latest AI eval accuracy.
 * Example: npm run report
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
// The AI eval writes its latest score here (accuracy is a number from 0 to 1).
const EVAL_RESULT_FILE = "tests/ai-eval/latest-result.json";

type VitestJson = {
  testResults: { name: string; assertionResults: { status: string; fullName: string }[] }[];
};

/** Runs every Vitest test once and returns the results as JSON, even if some tests fail. */
function runVitest(): VitestJson {
  const outputFile = join(mkdtempSync(join(tmpdir(), "test-report-")), "vitest.json");
  try {
    execFileSync("npx", ["vitest", "run", "--reporter=json", `--outputFile=${outputFile}`], { stdio: "ignore" });
  } catch {
    // A failing test makes Vitest exit with an error, but the JSON file is still written; failures are shown below.
  }
  return JSON.parse(readFileSync(outputFile, "utf8")) as VitestJson;
}

/** Lists the Playwright journeys without running them, and counts them per file. */
function listE2eTests(): Map<string, number> {
  const counts = new Map<string, number>();
  const output = execFileSync("npx", ["playwright", "test", "--list"], { encoding: "utf8" });
  for (const line of output.split("\n")) {
    const match = line.match(/\[chromium\] › ([^:]+):/);
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

const results = runVitest();
const byFolder = new Map<string, { total: number; passed: number; failed: number }>();
const regressions: string[] = [];

for (const file of results.testResults) {
  const folder = relative(root, dirname(file.name));
  const row = byFolder.get(folder) ?? { total: 0, passed: 0, failed: 0 };
  for (const test of file.assertionResults) {
    row.total += 1;
    if (test.status === "passed") row.passed += 1;
    if (test.status === "failed") row.failed += 1;
    if (test.fullName.includes("regression:")) regressions.push(test.fullName);
  }
  byFolder.set(folder, row);
}

console.log("\nUnit, AI eval and security tests (Vitest)\n");
console.table(
  [...byFolder.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, r]) => ({ folder, tests: r.total, passed: r.passed, failed: r.failed })),
);
const totals = [...byFolder.values()].reduce((sum, r) => ({ total: sum.total + r.total, passed: sum.passed + r.passed }), {
  total: 0,
  passed: 0,
});
console.log(`Total: ${totals.passed}/${totals.total} passing`);

console.log(`\nRegression tests: ${regressions.length}`);
for (const name of regressions) console.log(`  - ${name}`);

console.log("\nEnd-to-end journeys (Playwright, listed, run with npm run test:e2e)\n");
const e2e = listE2eTests();
console.table([...e2e.entries()].map(([file, tests]) => ({ file: `tests/e2e/${file}`, tests })));

console.log("\nAI eval accuracy");
if (existsSync(EVAL_RESULT_FILE)) {
  const evalResult = JSON.parse(readFileSync(EVAL_RESULT_FILE, "utf8")) as {
    accuracy: number;
    correct: number;
    total: number;
    mode?: string;
    runAt?: string;
  };
  const pct = (evalResult.accuracy * 100).toFixed(1);
  console.log(`  ${pct}% (${evalResult.correct}/${evalResult.total})${evalResult.mode ? `, mode: ${evalResult.mode}` : ""}${evalResult.runAt ? `, run at ${evalResult.runAt}` : ""}`);
} else {
  console.log("  No eval results yet. Run npm run eval once the AI eval exists.");
}
