import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPartnerships: vi.fn(),
  findSetting: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnership: { findMany: mocks.findPartnerships },
    siteSetting: { findUnique: mocks.findSetting },
  },
}));

vi.mock("@/domain/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { hasPermission, PERMISSIONS } from "@/domain/auth/permissions";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import {
  DEFAULT_PARTNER_SALES_SETTINGS,
  PARTNER_SALES_SETTINGS_KEY,
  partnerSalesSettings,
} from "@/domain/partner-sales/settings";

const authContext = {
  user: { id: "user-1", email: "partner@example.com" },
  grants: [],
  isSuperAdministrator: false,
};

function partnership(
  overrides: Partial<{
    id: string;
    status: string;
    suspendedAt: Date | null;
    terminatedAt: Date | null;
    agreement: { status: string; expiresAt: Date | null } | null;
  }> = {},
) {
  return {
    id: "partnership-1",
    partnerNumber: "PARTNER-001",
    status: "APPROVED",
    suspendedAt: null,
    terminatedAt: null,
    agreement: {
      status: "ACTIVE",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    },
    ...overrides,
  };
}

describe("partner sales settings", () => {
  it("defaults the channel to disabled when the setting is absent or malformed", async () => {
    mocks.findSetting.mockResolvedValueOnce(null).mockResolvedValueOnce({
      value: { enabled: "yes" },
    });

    await expect(partnerSalesSettings()).resolves.toEqual(
      DEFAULT_PARTNER_SALES_SETTINGS,
    );
    await expect(partnerSalesSettings()).resolves.toEqual(
      DEFAULT_PARTNER_SALES_SETTINGS,
    );
    expect(mocks.findSetting).toHaveBeenCalledWith({
      where: { key: PARTNER_SALES_SETTINGS_KEY },
      select: { value: true },
    });
  });

  it("returns an explicitly enabled channel setting", async () => {
    mocks.findSetting.mockResolvedValue({ value: { enabled: true } });

    await expect(partnerSalesSettings()).resolves.toEqual({ enabled: true });
  });
});

describe("requirePartnerSalesContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(authContext);
    mocks.findSetting.mockResolvedValue({ value: { enabled: true } });
    mocks.findPartnerships.mockResolvedValue([partnership()]);
  });

  it("denies access while the global feature is disabled", async () => {
    mocks.findSetting.mockResolvedValue({ value: { enabled: false } });

    await expect(requirePartnerSalesContext()).rejects.toThrow(
      "redirect:/unauthorized",
    );
  });

  it.each([
    "DRAFT",
    "CONDITIONALLY_APPROVED",
    "SUSPENDED",
    "EXPIRED",
    "TERMINATED",
  ])("denies an inactive %s partnership", async (status) => {
    mocks.findPartnerships.mockResolvedValue([partnership({ status })]);

    await expect(requirePartnerSalesContext()).rejects.toThrow(
      "redirect:/unauthorized",
    );
  });

  it("denies a partnership carrying suspension state even if its status is approved", async () => {
    mocks.findPartnerships.mockResolvedValue([
      partnership({ suspendedAt: new Date("2026-09-01T00:00:00.000Z") }),
    ]);

    await expect(requirePartnerSalesContext()).rejects.toThrow(
      "redirect:/unauthorized",
    );
  });

  it("denies access when the partnership has no active agreement", async () => {
    mocks.findPartnerships.mockResolvedValue([
      partnership({ agreement: null }),
    ]);

    await expect(requirePartnerSalesContext()).rejects.toThrow(
      "redirect:/unauthorized",
    );
  });

  it("denies access when the active agreement has expired", async () => {
    mocks.findPartnerships.mockResolvedValue([
      partnership({
        agreement: {
          status: "ACTIVE",
          expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        },
      }),
    ]);

    await expect(requirePartnerSalesContext()).rejects.toThrow(
      "redirect:/unauthorized",
    );
  });

  it("denies an explicitly requested partnership unrelated to the current user", async () => {
    mocks.findPartnerships.mockResolvedValue([partnership()]);

    await expect(
      requirePartnerSalesContext("unrelated-partnership"),
    ).rejects.toThrow("redirect:/unauthorized");
    expect(mocks.findPartnerships).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: authContext.user.id } }),
    );
  });

  it("requires explicit selection whenever the user owns multiple partnerships", async () => {
    mocks.findPartnerships.mockResolvedValue([
      partnership(),
      partnership({ id: "partnership-2" }),
    ]);

    await expect(requirePartnerSalesContext()).rejects.toThrow(
      "redirect:/unauthorized",
    );
  });

  it("returns only the explicitly selected active authorized partnership", async () => {
    mocks.findPartnerships.mockResolvedValue([
      partnership(),
      partnership({ id: "partnership-2" }),
    ]);

    const result = await requirePartnerSalesContext("partnership-2");

    expect(result.context).toBe(authContext);
    expect(result.partnership.id).toBe("partnership-2");
  });

  it("returns the sole active authorized partnership when selection is unambiguous", async () => {
    const result = await requirePartnerSalesContext();

    expect(result.context).toBe(authContext);
    expect(result.partnership.id).toBe("partnership-1");
  });
});

describe("partner sales Admin permissions", () => {
  const keys = [
    "partner_sales.profile.approve",
    "partner_sales.catalogue.manage",
    "partner_sales.pricing.approve",
    "partner_sales.commission.manage",
    "partner_sales.payout.prepare",
    "partner_sales.payout.approve",
  ] as const;

  it("defines every channel permission without implicitly granting it", () => {
    expect(PERMISSIONS).toEqual(expect.arrayContaining([...keys]));
    for (const key of keys) expect(hasPermission([], key)).toBe(false);

    const migration = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20260922190000_partner_sales_channel/migration.sql",
      ),
      "utf8",
    );
    for (const key of keys) expect(migration).toContain(`'${key}'`);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"RolePermission"/i);
  });

  it("keeps pricing approval, payout preparation, and payout approval separate", () => {
    const pricingOnly = [
      { key: "partner_sales.pricing.approve", effect: "ALLOW" as const },
    ];
    const preparationOnly = [
      { key: "partner_sales.payout.prepare", effect: "ALLOW" as const },
    ];
    const approvalOnly = [
      { key: "partner_sales.payout.approve", effect: "ALLOW" as const },
    ];

    expect(
      hasPermission(pricingOnly, "partner_sales.pricing.approve"),
    ).toBe(true);
    expect(hasPermission(pricingOnly, "partner_sales.payout.prepare")).toBe(
      false,
    );
    expect(hasPermission(pricingOnly, "partner_sales.payout.approve")).toBe(
      false,
    );
    expect(
      hasPermission(preparationOnly, "partner_sales.payout.prepare"),
    ).toBe(true);
    expect(
      hasPermission(preparationOnly, "partner_sales.payout.approve"),
    ).toBe(false);
    expect(hasPermission(approvalOnly, "partner_sales.payout.approve")).toBe(
      true,
    );
    expect(hasPermission(approvalOnly, "partner_sales.payout.prepare")).toBe(
      false,
    );
    expect(hasPermission(approvalOnly, "partner_sales.pricing.approve")).toBe(
      false,
    );
  });
});
