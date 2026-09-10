import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses an authoritative full feed for the unattended daily cron", () => {
  const config = JSON.parse(readFileSync("railway.supplier-cron.json", "utf8")) as { deploy: { startCommand: string } };
  expect(config.deploy.startCommand).toBe("npm run automation:suppliers -- --full");
  const script = readFileSync("scripts/process-supplier-sync.ts", "utf8");
  expect(script).toContain('process.argv.includes("--incremental")?"INCREMENTAL":"FULL"');
  expect(script).toContain('--provider=');
});
