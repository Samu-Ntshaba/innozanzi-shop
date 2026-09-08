import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses the incremental supplier feed for the unattended daily cron", () => {
  const config = JSON.parse(readFileSync("railway.supplier-cron.json", "utf8")) as { deploy: { startCommand: string } };
  expect(config.deploy.startCommand).toBe("npm run automation:suppliers");
  const script = readFileSync("scripts/process-supplier-sync.ts", "utf8");
  expect(script).toContain('process.argv.includes("--full")?"FULL":"INCREMENTAL"');
});
