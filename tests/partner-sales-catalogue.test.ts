import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => {
  const profileFindUnique = vi.fn();
  const assignmentFindUnique = vi.fn();
  const assignmentFindFirst = vi.fn();
  const assignmentCreate = vi.fn();
  const assignmentUpdateMany = vi.fn();
  const auditCreate = vi.fn();
  const productFindUnique = vi.fn();
  const supplierProductFindUnique = vi.fn();
  const comboFindUnique = vi.fn();
  const settingFindUnique = vi.fn();
  const partnershipFindUnique = vi.fn();
  const requirePermission = vi.fn();
  const getPublicUrl = vi.fn();

  const tx = {
    partnerSalesProfile: { findUnique: profileFindUnique },
    partnerCatalogueAssignment: {
      findUnique: assignmentFindUnique,
      findFirst: assignmentFindFirst,
      create: assignmentCreate,
      updateMany: assignmentUpdateMany,
    },
    product: { findUnique: productFindUnique },
    supplierCatalogueProduct: { findUnique: supplierProductFindUnique },
    comboCampaign: { findUnique: comboFindUnique },
    auditLog: { create: auditCreate },
  };

  return {
    ...tx,
    profileFindUnique,
    assignmentFindUnique,
    assignmentFindFirst,
    assignmentCreate,
    assignmentUpdateMany,
    auditCreate,
    productFindUnique,
    supplierProductFindUnique,
    comboFindUnique,
    settingFindUnique,
    partnershipFindUnique,
    requirePermission,
    getPublicUrl,
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    notFound: vi.fn((): never => {
      throw new Error("not-found");
    }),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    partnerSalesProfile: mocks.partnerSalesProfile,
    partnerCatalogueAssignment: mocks.partnerCatalogueAssignment,
    product: mocks.product,
    supplierCatalogueProduct: mocks.supplierCatalogueProduct,
    comboCampaign: mocks.comboCampaign,
    auditLog: mocks.auditLog,
    siteSetting: { findUnique: mocks.settingFindUnique },
    partnership: { findUnique: mocks.partnershipFindUnique },
  },
}));

vi.mock("@/domain/auth/session", () => ({
  requirePermission: mocks.requirePermission,
  getAuthContext: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    storage: {
      from: () => ({ getPublicUrl: mocks.getPublicUrl }),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: vi.fn(),
  usePathname: () => "/admin/partnerships/partners/partner-1/sales-channel/catalogue",
}));

import {
  assignCatalogueItem,
  backfillLegacySupplierCatalogueMediaSnapshots,
  partnerCatalogue,
  withdrawCatalogueItem,
} from "@/domain/partner-sales/catalogue";
import { POST } from "@/app/api/admin/partner-sales/catalogue/route";
import PartnerCatalogueAdminPage from "@/app/admin/partnerships/partners/[id]/sales-channel/catalogue/page";
import PublicPartnerCataloguePage from "@/app/(store)/p/[partnerSlug]/page";

const PARTNERSHIP_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PARTNERSHIP_ID = "99999999-9999-4999-8999-999999999999";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const ASSIGNMENT_ID = "33333333-3333-4333-8333-333333333333";
const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const SUPPLIER_PRODUCT_ID = "66666666-6666-4666-8666-666666666666";
const COMBO_ID = "77777777-7777-4777-8777-777777777777";
const NOW = new Date("2026-09-23T10:00:00.000Z");

const decimal = (value: string) => ({ toString: () => value });

const actor = {
  user: { id: ADMIN_ID },
  grants: [
    { key: "partner_sales.catalogue.manage", effect: "ALLOW" as const },
  ],
  isSuperAdministrator: false,
};

const product = {
  id: PRODUCT_ID,
  name: "Business Notebook 14",
  sku: "NOTE-14",
  shortDescription: "A dependable notebook for growing teams.",
  status: "PUBLISHED",
  deletedAt: null,
  isTestData: false,
  stockStatus: "IN_STOCK",
  costPrice: { toString: () => "12450.00" },
  images: [
    {
      path: "https://assets.example/notebook.webp",
      altText: "Business Notebook 14",
      isPrimary: true,
    },
  ],
  inventory: [{ id: "inventory-1", onHand: 8, reserved: 1 }],
  variants: [],
  suppliers: [
    {
      costPrice: { toString: () => "12000.00" },
      supplier: { companyName: "SECRET SUPPLIER" },
    },
  ],
  regularPrice: { toString: () => "19999.00" },
  salePrice: null,
  internalNote: "SECRET INTERNAL NOTE",
  protectedFloor: "SECRET FLOOR",
  margin: "SECRET MARGIN",
};

const supplierProduct = {
  id: SUPPLIER_PRODUCT_ID,
  name: "Vendor Business Display",
  manufacturerSku: "DISPLAY-27",
  shortDescription: "A business display for productive teams.",
  description: "A supplier-sourced business display.",
  active: true,
  displayPreferred: true,
  availability: "IN_STOCK",
  stock: 12,
  costPrice: decimal("6000.00"),
  recommendedRetail: decimal("8999.00"),
  promotionalPrice: decimal("5500.00"),
  promotionStartsAt: new Date("2026-09-22T00:00:00.000Z"),
  promotionEndsAt: new Date("2026-09-24T00:00:00.000Z"),
  images: [
    "https://media.secret-supplier.example/catalogue/private/display-27.jpg",
  ],
  lastSeenAt: NOW,
  feed: { enabled: true, lastSuccessAt: NOW },
  supplier: {
    purchasingEnabled: true,
    approvalStatus: "APPROVED",
    companyName: "SECRET SUPPLIER HOST OWNER",
  },
};

const comboCampaign = {
  id: COMBO_ID,
  slug: "business-desk-bundle",
  name: "Business Desk Bundle",
  headline: "Equip a productive desk",
  description: "A current display bundle for business teams.",
  type: "CUSTOM",
  status: "ACTIVE",
  startsAt: new Date("2026-09-20T00:00:00.000Z"),
  endsAt: new Date("2026-09-30T00:00:00.000Z"),
  normalPrice: decimal("9999.00"),
  comboPrice: decimal("9499.00"),
  estimatedCost: decimal("5500.00"),
  imageUrl: "https://assets.example/business-desk-bundle.webp",
  mobileImageUrl: null,
  isTestData: false,
  approvedAt: new Date("2026-09-20T08:00:00.000Z"),
  approvedById: ADMIN_ID,
  items: [
    {
      id: "88888888-8888-4888-8888-888888888888",
      quantity: 1,
      product: null,
      supplierCatalogueProduct: supplierProduct,
    },
  ],
};

const activeProfile = {
  id: PROFILE_ID,
  partnershipId: PARTNERSHIP_ID,
  publicSlug: "acme-business",
  status: "ACTIVE",
  publicCatalogueEnabled: true,
  displayName: "Acme Business",
  contactEmail: "sales@acme.example",
  contactPhone: "+27 11 555 0100",
  footerText: "Technology sourcing for ambitious teams.",
  themePreset: "OCEAN",
  approvedAt: new Date("2026-09-22T12:00:00.000Z"),
  approvedById: ADMIN_ID,
  suspendedAt: null,
  revokedAt: null,
  defaultCommissionValue: "SECRET COMMISSION",
  logoDocument: {
    bucket: "product-images",
    path: "partner-sales/acme/logo.webp",
    originalName: "SECRET ORIGINAL NAME",
  },
  partnership: {
    status: "APPROVED",
    suspendedAt: null,
    terminatedAt: null,
    agreement: {
      status: "ACTIVE",
      expiresAt: new Date("2027-09-23T00:00:00.000Z"),
    },
  },
  catalogueAssignments: [] as Array<Record<string, unknown>>,
};

function assignInput() {
  return {
    partnershipId: PARTNERSHIP_ID,
    sourceType: "PRODUCT" as const,
    sourceId: PRODUCT_ID,
    visibleFrom: "2026-09-23T09:00:00.000Z",
    visibleUntil: "2026-10-23T09:00:00.000Z",
    presentationTitle: "Team-ready notebook",
    presentationCopy: "Ask us to tailor a business quotation.",
  };
}

function supplierAssignInput() {
  return {
    ...assignInput(),
    sourceType: "SUPPLIER_CATALOGUE_PRODUCT" as const,
    sourceId: SUPPLIER_PRODUCT_ID,
    presentationTitle: "Business display",
  };
}

function comboAssignInput() {
  return {
    ...assignInput(),
    sourceType: "COMBO" as const,
    sourceId: COMBO_ID,
    presentationTitle: "Business desk bundle",
  };
}

describe("partner catalogue assignment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeProfile.catalogueAssignments = [];
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: true } });
    mocks.profileFindUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
      "partnershipId" in where ? activeProfile : activeProfile,
    );
    mocks.productFindUnique.mockResolvedValue(product);
    mocks.supplierProductFindUnique.mockResolvedValue(supplierProduct);
    mocks.comboFindUnique.mockResolvedValue(comboCampaign);
    mocks.assignmentFindUnique.mockResolvedValue(null);
    mocks.assignmentFindFirst.mockResolvedValue(null);
    mocks.assignmentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.assignmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: ASSIGNMENT_ID,
        ...data,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.requirePermission.mockResolvedValue(actor);
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://assets.example/acme-logo.webp" },
    });
  });

  it("creates only an explicit typed assignment and audits its approval", async () => {
    const assignment = await assignCatalogueItem(assignInput(), actor, NOW);

    expect(assignment).toEqual(
      expect.objectContaining({
        id: ASSIGNMENT_ID,
        profileId: PROFILE_ID,
        sourceType: "PRODUCT",
        sourceId: PRODUCT_ID,
        status: "ACTIVE",
        approvedById: ADMIN_ID,
        approvedAt: NOW,
        availabilityFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(mocks.assignmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        profileId: PROFILE_ID,
        sourceType: "PRODUCT",
        sourceId: PRODUCT_ID,
        presentationTitle: "Team-ready notebook",
        presentationCopy: "Ask us to tailor a business quotation.",
        mediaSnapshot: [
          {
            url: "https://assets.example/notebook.webp",
            altText: "Business Notebook 14",
          },
        ],
      }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: ADMIN_ID,
        action: "partner-sales.catalogue.assign",
        entityType: "PartnerCatalogueAssignment",
        entityId: ASSIGNMENT_ID,
        before: undefined,
        after: expect.objectContaining({
          profileId: PROFILE_ID,
          sourceType: "PRODUCT",
          sourceId: PRODUCT_ID,
          status: "ACTIVE",
        }),
      }),
    });
  });

  it("denies assignment without the dedicated catalogue permission", async () => {
    await expect(
      assignCatalogueItem(assignInput(), { ...actor, grants: [] }, NOW),
    ).rejects.toThrow(/permission/i);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a caller-supplied profile identity instead of allowing cross-partner assignment", async () => {
    await expect(
      assignCatalogueItem(
        { ...assignInput(), profileId: OTHER_PARTNERSHIP_ID },
        actor,
        NOW,
      ),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects CAMPAIGN because ComboCampaign has no combo-versus-campaign discriminator", async () => {
    await expect(
      assignCatalogueItem(
        { ...comboAssignInput(), sourceType: "CAMPAIGN" },
        actor,
        NOW,
      ),
    ).rejects.toThrow(/source type|campaign/i);
    expect(mocks.comboFindUnique).not.toHaveBeenCalled();
    expect(mocks.assignmentCreate).not.toHaveBeenCalled();
  });

  it("rejects COMBO before any legacy assignment lookup", async () => {
    mocks.assignmentFindFirst.mockResolvedValue({
      id: ASSIGNMENT_ID,
      profileId: PROFILE_ID,
      sourceType: "CAMPAIGN",
      sourceId: COMBO_ID,
      status: "ACTIVE",
    });

    await expect(assignCatalogueItem(comboAssignInput(), actor, NOW)).rejects.toThrow(/disabled/i);
    expect(mocks.assignmentFindFirst).not.toHaveBeenCalled();
    expect(mocks.assignmentCreate).not.toHaveBeenCalled();
  });

  it("omits withdrawn and expired assignments from the public catalogue", async () => {
    const assignment = await assignCatalogueItem(assignInput(), actor, NOW);
    activeProfile.catalogueAssignments = [
      assignment,
      {
        ...assignment,
        id: "66666666-6666-4666-8666-666666666666",
        status: "WITHDRAWN",
        withdrawnAt: new Date("2026-09-23T09:30:00.000Z"),
      },
      {
        ...assignment,
        id: "77777777-7777-4777-8777-777777777777",
        visibleUntil: new Date("2026-09-23T09:59:59.000Z"),
      },
    ];

    const catalogue = await partnerCatalogue("acme-business", NOW);

    expect(catalogue?.items).toEqual([
      {
        assignmentId: ASSIGNMENT_ID,
        title: "Team-ready notebook",
        description: "Ask us to tailor a business quotation.",
        sku: "NOTE-14",
        image: {
          url: "https://assets.example/notebook.webp",
          altText: "Business Notebook 14",
        },
      },
    ]);
  });

  it("returns no catalogue for an inactive approved channel", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...activeProfile,
      status: "SUSPENDED",
    });

    await expect(partnerCatalogue("acme-business", NOW)).resolves.toBeNull();
    expect(mocks.productFindUnique).not.toHaveBeenCalled();
  });

  it("returns no catalogue while the partner-sales feature is disabled", async () => {
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: false } });

    await expect(partnerCatalogue("acme-business", NOW)).resolves.toBeNull();
    expect(mocks.profileFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["approval timestamp", { approvedAt: null }],
    ["approval actor", { approvedById: null }],
    ["catalogue publishing", { publicCatalogueEnabled: false }],
    [
      "partnership suspension",
      {
        partnership: {
          ...activeProfile.partnership,
          suspendedAt: new Date("2026-09-23T09:00:00.000Z"),
        },
      },
    ],
    [
      "partnership termination",
      {
        partnership: {
          ...activeProfile.partnership,
          terminatedAt: new Date("2026-09-23T09:00:00.000Z"),
        },
      },
    ],
    [
      "active agreement",
      {
        partnership: { ...activeProfile.partnership, agreement: null },
      },
    ],
    [
      "unexpired agreement",
      {
        partnership: {
          ...activeProfile.partnership,
          agreement: {
            status: "ACTIVE",
            expiresAt: new Date("2026-09-23T09:59:59.000Z"),
          },
        },
      },
    ],
  ])("requires %s before publishing", async (_gate, override) => {
    mocks.profileFindUnique.mockResolvedValue({ ...activeProfile, ...override });

    await expect(partnerCatalogue("acme-business", NOW)).resolves.toBeNull();
    expect(mocks.productFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    [
      "cost",
      {
        ...product,
        costPrice: { toString: () => "13000.00" },
      },
    ],
    [
      "stock",
      {
        ...product,
        inventory: [{ id: "inventory-1", onHand: 2, reserved: 1 }],
      },
    ],
  ])("omits an assignment when current %s no longer matches approval", async (_change, changedProduct) => {
    const assignment = await assignCatalogueItem(assignInput(), actor, NOW);
    activeProfile.catalogueAssignments = [assignment];
    mocks.productFindUnique.mockResolvedValue(changedProduct);

    const catalogue = await partnerCatalogue("acme-business", NOW);

    expect(catalogue?.items).toEqual([]);
  });

  it("omits a variant product when a currently sellable variant cost changes", async () => {
    const productWithVariant = {
      ...product,
      variants: [
        {
          id: "variant-1",
          isActive: true,
          costPrice: { toString: () => "12500.00" },
          inventory: { onHand: 5, reserved: 0 },
        },
      ],
    };
    mocks.productFindUnique.mockResolvedValue(productWithVariant);
    const assignment = await assignCatalogueItem(assignInput(), actor, NOW);
    activeProfile.catalogueAssignments = [assignment];
    mocks.productFindUnique.mockResolvedValue({
      ...productWithVariant,
      variants: [
        {
          ...productWithVariant.variants[0],
          costPrice: { toString: () => "13000.00" },
        },
      ],
    });

    const catalogue = await partnerCatalogue("acme-business", NOW);

    expect(catalogue?.items).toEqual([]);
  });

  it("invalidates a supplier assignment when its promotion window changes", async () => {
    const assignment = await assignCatalogueItem(
      supplierAssignInput(),
      actor,
      NOW,
    );
    activeProfile.catalogueAssignments = [assignment];
    mocks.supplierProductFindUnique.mockResolvedValue({
      ...supplierProduct,
      promotionEndsAt: new Date("2026-09-23T09:59:59.000Z"),
    });

    const catalogue = await partnerCatalogue("acme-business", NOW);

    expect(catalogue?.items).toEqual([]);
  });

  it("rejects combo assignment before component pricing is consulted", async () => {
    await expect(assignCatalogueItem(comboAssignInput(), actor, NOW)).rejects.toThrow(/disabled/i);
    expect(mocks.comboFindUnique).not.toHaveBeenCalled();
  });

  it("never snapshots or publishes a supplier-hosted media URL", async () => {
    const assignment = await assignCatalogueItem(
      supplierAssignInput(),
      actor,
      NOW,
    );
    expect(assignment.mediaSnapshot).toEqual([]);
    activeProfile.catalogueAssignments = [assignment];

    const catalogue = await partnerCatalogue("acme-business", NOW);
    const html = renderToStaticMarkup(
      await PublicPartnerCataloguePage({
        params: Promise.resolve({ partnerSlug: "acme-business" }),
      }),
    );

    expect(catalogue?.items[0]?.image).toBeNull();
    expect(JSON.stringify(catalogue)).not.toContain("secret-supplier.example");
    expect(JSON.stringify(catalogue)).not.toContain("/catalogue/private/");
    expect(html).not.toContain("secret-supplier.example");
    expect(html).not.toContain("/catalogue/private/");
  });

  it("withdraws with an optimistic state check and audited reason", async () => {
    const assigned = await assignCatalogueItem(assignInput(), actor, NOW);
    mocks.assignmentFindUnique.mockResolvedValue({
      ...assigned,
      profile: { partnershipId: PARTNERSHIP_ID },
    });

    const withdrawn = await withdrawCatalogueItem(
      {
        partnershipId: PARTNERSHIP_ID,
        assignmentId: ASSIGNMENT_ID,
        reason: "Supplier programme ended.",
      },
      actor,
      NOW,
    );

    expect(withdrawn).toEqual(
      expect.objectContaining({
        id: ASSIGNMENT_ID,
        status: "WITHDRAWN",
        withdrawnAt: NOW,
      }),
    );
    expect(mocks.assignmentUpdateMany).toHaveBeenCalledWith({
      where: { id: ASSIGNMENT_ID, status: "ACTIVE" },
      data: { status: "WITHDRAWN", withdrawnAt: NOW },
    });
    expect(mocks.auditCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        action: "partner-sales.catalogue.withdraw",
        entityId: ASSIGNMENT_ID,
        before: expect.objectContaining({ status: "ACTIVE" }),
        after: expect.objectContaining({
          status: "WITHDRAWN",
          reason: "Supplier programme ended.",
        }),
      }),
    });
  });

  it("denies withdrawing an assignment owned by another partner", async () => {
    mocks.assignmentFindUnique.mockResolvedValue({
      id: ASSIGNMENT_ID,
      profileId: PROFILE_ID,
      sourceType: "PRODUCT",
      sourceId: PRODUCT_ID,
      status: "ACTIVE",
      visibleFrom: null,
      visibleUntil: null,
      presentationTitle: null,
      presentationCopy: null,
      mediaSnapshot: null,
      availabilityFingerprint: "abc",
      approvedById: ADMIN_ID,
      approvedAt: NOW,
      withdrawnAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      profile: { partnershipId: OTHER_PARTNERSHIP_ID },
    });

    await expect(
      withdrawCatalogueItem(
        {
          partnershipId: PARTNERSHIP_ID,
          assignmentId: ASSIGNMENT_ID,
          reason: "No longer approved for this partner.",
        },
        actor,
        NOW,
      ),
    ).rejects.toThrow(/does not belong/i);
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

describe("partner catalogue Admin route and page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeProfile.catalogueAssignments = [
      {
        id: ASSIGNMENT_ID,
        sourceType: "PRODUCT",
        sourceId: PRODUCT_ID,
        status: "ACTIVE",
        visibleFrom: null,
        visibleUntil: null,
        presentationTitle: "Team-ready notebook",
        approvedAt: NOW,
        withdrawnAt: null,
      },
    ];
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: true } });
    mocks.requirePermission.mockResolvedValue(actor);
    mocks.profileFindUnique.mockResolvedValue(activeProfile);
    mocks.productFindUnique.mockResolvedValue(product);
    mocks.assignmentFindUnique.mockResolvedValue(null);
    mocks.assignmentFindFirst.mockResolvedValue(null);
    mocks.assignmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: ASSIGNMENT_ID, ...data, createdAt: NOW, updatedAt: NOW }),
    );
    mocks.auditCreate.mockResolvedValue({ id: "audit-route" });
    mocks.partnershipFindUnique.mockResolvedValue({
      id: PARTNERSHIP_ID,
      partnerNumber: "PN-ACME",
      owner: { name: "Alex Partner", email: "alex@acme.example" },
      salesProfile: activeProfile,
    });
  });

  it("uses a stable permission-guarded POST and a canonical redirect", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(assignInput())) {
      form.set(key, value);
    }
    form.set("operation", "assign");
    form.set("returnTo", "https://evil.example/phish");

    const response = await POST(
      new Request("https://shop.example/api/admin/partner-sales/catalogue", {
        method: "POST",
        headers: {
          origin: "https://shop.example",
          "sec-fetch-site": "same-origin",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(form as never),
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://shop.example/admin/partnerships/partners/${PARTNERSHIP_ID}/sales-channel/catalogue?status=assigned`,
    );
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      "partner_sales.catalogue.manage",
    );
  });

  it("renders assignment and withdrawal controls on the partner-scoped Admin page", async () => {
    const html = renderToStaticMarkup(
      await PartnerCatalogueAdminPage({
        params: Promise.resolve({ id: PARTNERSHIP_ID }),
        searchParams: Promise.resolve({ status: "assigned" }),
      }),
    );

    expect(html).toContain("Approved catalogue");
    expect(html).toContain('action="/api/admin/partner-sales/catalogue"');
    expect(html).toContain('name="sourceType"');
    expect(html).toContain('value="SUPPLIER_CATALOGUE_PRODUCT"');
    expect(html).not.toContain('value="COMBO"');
    expect(html).not.toContain('value="CAMPAIGN"');
    expect(html).toContain("Withdraw");
    expect(html).not.toContain("SECRET COMMISSION");
  });
});

describe("public partner catalogue", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: true } });
    mocks.productFindUnique.mockResolvedValue(product);
    mocks.supplierProductFindUnique.mockResolvedValue(supplierProduct);
    mocks.comboFindUnique.mockResolvedValue(comboCampaign);
    mocks.assignmentFindFirst.mockResolvedValue(null);
    mocks.assignmentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.assignmentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: ASSIGNMENT_ID, ...data, createdAt: NOW, updatedAt: NOW }),
    );
    mocks.auditCreate.mockResolvedValue({ id: "audit-public" });
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://assets.example/acme-logo.webp" },
    });
    mocks.profileFindUnique.mockResolvedValue(activeProfile);
    activeProfile.catalogueAssignments = [
      await assignCatalogueItem(assignInput(), actor, NOW),
    ];
  });

  it("returns a strict DTO and redacts prices, costs, margins, supplier and internal fields", async () => {
    const catalogue = await partnerCatalogue("acme-business", NOW);
    const serialized = JSON.stringify(catalogue);

    expect(catalogue).toEqual({
      profile: {
        publicSlug: "acme-business",
        displayName: "Acme Business",
        contactEmail: "sales@acme.example",
        contactPhone: "+27 11 555 0100",
        footerText: "Technology sourcing for ambitious teams.",
        themePreset: "OCEAN",
        logoUrl: "https://assets.example/acme-logo.webp",
      },
      items: [
        {
          assignmentId: ASSIGNMENT_ID,
          title: "Team-ready notebook",
          description: "Ask us to tailor a business quotation.",
          sku: "NOTE-14",
          image: {
            url: "https://assets.example/notebook.webp",
            altText: "Business Notebook 14",
          },
        },
      ],
    });
    for (const secret of [
      "19999.00",
      "12450.00",
      "SECRET FLOOR",
      "SECRET MARGIN",
      "SECRET SUPPLIER",
      "SECRET INTERNAL NOTE",
      "SECRET COMMISSION",
      "SECRET ORIGINAL NAME",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled();
  });

  it("suppresses a legacy supplier media snapshot without writing during the public read", async () => {
    const supplierAssignment = await assignCatalogueItem(
      supplierAssignInput(),
      actor,
      NOW,
    );
    activeProfile.catalogueAssignments = [
      {
        ...supplierAssignment,
        mediaSnapshot: [
          {
            url: "https://media.secret-supplier.example/catalogue/private/display-27.jpg",
            altText: "Vendor Business Display",
          },
        ],
      },
    ];
    mocks.assignmentUpdateMany.mockClear();

    const catalogue = await partnerCatalogue("acme-business", NOW);

    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled();
    expect(catalogue?.items).toEqual([
      expect.objectContaining({
        assignmentId: ASSIGNMENT_ID,
        image: null,
      }),
    ]);
    expect(JSON.stringify(catalogue)).not.toContain("secret-supplier.example");
  });

  it("filters legacy combo and campaign assignments before resolving their source", async () => {
    activeProfile.catalogueAssignments = [
      {
        id: "legacy-combo-assignment",
        profileId: PROFILE_ID,
        sourceType: "COMBO",
        sourceId: COMBO_ID,
        status: "ACTIVE",
        visibleFrom: null,
        visibleUntil: null,
        presentationTitle: null,
        presentationCopy: null,
        mediaSnapshot: [],
        availabilityFingerprint: "legacy",
        approvedById: ADMIN_ID,
        approvedAt: NOW,
        withdrawnAt: null,
      },
      {
        id: "legacy-campaign-assignment",
        profileId: PROFILE_ID,
        sourceType: "CAMPAIGN",
        sourceId: COMBO_ID,
        status: "ACTIVE",
        visibleFrom: null,
        visibleUntil: null,
        presentationTitle: null,
        presentationCopy: null,
        mediaSnapshot: [],
        availabilityFingerprint: "legacy",
        approvedById: ADMIN_ID,
        approvedAt: NOW,
        withdrawnAt: null,
      },
    ];

    await expect(partnerCatalogue("acme-business", NOW)).resolves.toMatchObject({ items: [] });
    expect(mocks.comboFindUnique).not.toHaveBeenCalled();
  });

  it("performs no cleanup write for a missing public slug", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);

    await expect(
      partnerCatalogue("missing-partner", NOW),
    ).resolves.toBeNull();
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled();
  });

  it("retains a supplier-only idempotent cleanup as an explicit internal helper", async () => {
    await backfillLegacySupplierCatalogueMediaSnapshots();

    expect(mocks.assignmentUpdateMany).toHaveBeenCalledWith({
      where: {
        sourceType: "SUPPLIER_CATALOGUE_PRODUCT",
        mediaSnapshot: { not: Prisma.DbNull },
      },
      data: { mediaSnapshot: Prisma.DbNull },
    });
  });

  it("preserves approved PRODUCT media", async () => {
    const productAssignment = activeProfile.catalogueAssignments[0];
    activeProfile.catalogueAssignments = [productAssignment];

    const catalogue = await partnerCatalogue("acme-business", NOW);

    expect(catalogue?.items.map((item) => item.image)).toEqual([
      {
        url: "https://assets.example/notebook.webp",
        altText: "Business Notebook 14",
      },
    ]);
  });

  it("renders co-branding, merchant disclosure and quotation actions without sensitive fields", async () => {
    const html = renderToStaticMarkup(
      await PublicPartnerCataloguePage({
        params: Promise.resolve({ partnerSlug: "acme-business" }),
      }),
    );

    expect(html).toContain("Acme Business");
    expect(html).toContain("Team-ready notebook");
    expect(html).toContain("Request quotation");
    expect(html).toContain("Innozanzi is the merchant of record");
    expect(html).toContain("https://assets.example/acme-logo.webp");
    for (const secret of [
      "19999.00",
      "12450.00",
      "SECRET FLOOR",
      "SECRET MARGIN",
      "SECRET SUPPLIER",
      "SECRET INTERNAL NOTE",
      "SECRET COMMISSION",
      "SECRET ORIGINAL NAME",
    ]) {
      expect(html).not.toContain(secret);
    }
  });

  it("renders the segment not-found boundary for an inactive channel", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...activeProfile,
      status: "SUSPENDED",
    });

    await expect(
      PublicPartnerCataloguePage({
        params: Promise.resolve({ partnerSlug: "acme-business" }),
      }),
    ).rejects.toThrow("not-found");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
