import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ settings: vi.fn() }));
vi.mock("@/domain/commerce/settings", () => ({ getCommerceSettings: mocks.settings }));

import { sellableSupplierWhere } from "@/integrations/suppliers/availability";

beforeEach(() => {
  mocks.settings.mockResolvedValue({ freshnessHours: 30 });
});

it("requires a preferred offer from an approved, enabled and fresh supplier feed", async () => {
  const where = await sellableSupplierWhere();

  expect(where).toMatchObject({
    active: true,
    displayPreferred: true,
    availability: "IN_STOCK",
    stock: { gt: 0 },
    costPrice: { gt: 0 },
    images: { isEmpty: false },
    supplier: { purchasingEnabled: true, approvalStatus: "APPROVED" },
    lastSeenAt: { gte: expect.any(Date) },
    feed: { enabled: true, lastSuccessAt: { gte: expect.any(Date) } },
  });
});
