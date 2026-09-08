import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ settings: vi.fn() }));
vi.mock("@/domain/commerce/settings", () => ({ getCommerceSettings: mocks.settings }));

import { sellableSupplierWhere } from "@/integrations/suppliers/availability";

beforeEach(() => {
  mocks.settings.mockResolvedValue({ freshnessHours: 30 });
});

it("requires a preferred offer from an approved, enabled and fresh supplier feed", async () => {
  const before = Date.now();
  const where = await sellableSupplierWhere();

  expect(where).toMatchObject({
    displayPreferred: true,
    supplier: { purchasingEnabled: true, approvalStatus: "APPROVED" },
    feed: { enabled: true },
  });
  expect(where.lastSeenAt.gte.getTime()).toBeGreaterThanOrEqual(before - 30 * 60 * 60_000);
  expect(where.feed.lastSuccessAt.gte.getTime()).toBeGreaterThanOrEqual(before - 30 * 60 * 60_000);
});
