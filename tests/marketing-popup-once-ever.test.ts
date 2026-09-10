import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("supports permanent popup acknowledgement and schedules today's apology", () => {
  const popup = readFileSync("src/components/store/marketing-popup.tsx", "utf8");
  expect(popup).toContain('item.frequency==="ONCE_EVER"&&localStorage.getItem');
  expect(popup).toContain('active.frequency==="ONCE_EVER")localStorage.setItem');

  const migration = readFileSync("prisma/migrations/20260910131500_service_apology_popup/migration.sql", "utf8");
  expect(migration).toContain("'service-apology-2026-09-10'");
  expect(migration).toContain("'frequency', 'ONCE_EVER'");
  expect(migration).toContain("TIMESTAMPTZ '2026-09-10 22:00:00+00'");
});
