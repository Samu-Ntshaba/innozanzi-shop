import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => {
  const profileFindUnique = vi.fn();
  const profileFindFirst = vi.fn();
  const profileCreate = vi.fn();
  const profileUpdate = vi.fn();
  const partnershipFindUnique = vi.fn();
  const documentCreate = vi.fn();
  const auditCreate = vi.fn();
  const auditFindFirst = vi.fn();
  const settingFindUnique = vi.fn();
  const upload = vi.fn();
  const remove = vi.fn();
  const getBucket = vi.fn();
  const createBucket = vi.fn();
  const getPublicUrl = vi.fn();

  const tx = {
    partnerSalesProfile: {
      findUnique: profileFindUnique,
      findFirst: profileFindFirst,
      create: profileCreate,
      update: profileUpdate,
    },
    partnership: { findUnique: partnershipFindUnique },
    uploadedDocument: { create: documentCreate },
    auditLog: { create: auditCreate, findFirst: auditFindFirst },
  };

  return {
    ...tx,
    profileFindUnique,
    profileFindFirst,
    profileCreate,
    profileUpdate,
    partnershipFindUnique,
    documentCreate,
    auditCreate,
    auditFindFirst,
    settingFindUnique,
    upload,
    remove,
    getBucket,
    createBucket,
    getPublicUrl,
    verifyImage: vi.fn(),
    requirePermission: vi.fn(),
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    partnerSalesProfile: mocks.partnerSalesProfile,
    partnership: mocks.partnership,
    uploadedDocument: mocks.uploadedDocument,
    auditLog: mocks.auditLog,
    siteSetting: { findUnique: mocks.settingFindUnique },
  },
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    storage: {
      getBucket: mocks.getBucket,
      createBucket: mocks.createBucket,
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: mocks.getPublicUrl,
      }),
    },
  }),
}));

vi.mock("@/lib/security/catalogue-image", () => ({
  verifiedCatalogueImage: mocks.verifyImage,
}));

vi.mock("@/domain/auth/session", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn((): never => {
    throw new Error("not-found");
  }),
  redirect: vi.fn(),
  usePathname: () =>
    `/admin/partnerships/partners/${PARTNERSHIP_ID}/sales-channel`,
}));

import {
  savePartnerSalesProfile,
  transitionPartnerSalesProfile,
} from "@/domain/partner-sales/profile-service";
import { POST } from "@/app/api/admin/partner-sales/profiles/[partnershipId]/route";
import PartnerSalesChannelPage from "@/app/admin/partnerships/partners/[id]/sales-channel/page";

const PARTNERSHIP_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";
const PARTNER_ID = "44444444-4444-4444-8444-444444444444";

const actor = {
  user: { id: ADMIN_ID },
  grants: [
    {
      key: "partner_sales.profile.approve",
      effect: "ALLOW" as const,
    },
  ],
  isSuperAdministrator: false,
};

const activePartnership = {
  id: PARTNERSHIP_ID,
  userId: PARTNER_ID,
  status: "APPROVED",
  suspendedAt: null,
  terminatedAt: null,
  agreement: {
    status: "ACTIVE",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  },
};

const existingProfile = {
  id: PROFILE_ID,
  partnershipId: PARTNERSHIP_ID,
  publicSlug: "acme-business",
  status: "PROFILE_INCOMPLETE",
  displayName: "Acme Business",
  legalName: "Acme Business (Pty) Ltd",
  registrationNumber: "2026/123456/07",
  vatNumber: null,
  logoDocumentId: "55555555-5555-4555-8555-555555555555",
  contactName: "Alex Partner",
  contactEmail: "alex@acme.example",
  contactPhone: "+27 11 555 0100",
  footerText: "Sales support from Acme Business.",
  themePreset: "OCEAN",
  defaultCommissionMethod: "PERCENTAGE",
  defaultCommissionValue: { toString: () => "7.5" },
  publicCatalogueEnabled: false,
  approvedAt: null,
  approvedById: null,
  suspendedAt: null,
  revokedAt: null,
};

const validInput = {
  partnershipId: PARTNERSHIP_ID,
  publicSlug: " Acme Business ",
  displayName: "Acme Business",
  legalName: "Acme Business (Pty) Ltd",
  registrationNumber: "2026/123456/07",
  vatNumber: "",
  contactName: "Alex Partner",
  contactEmail: "alex@acme.example",
  contactPhone: "+27 11 555 0100",
  footerText: "Sales support from Acme Business.",
  themePreset: "OCEAN" as const,
  defaultCommissionMethod: "PERCENTAGE" as const,
  defaultCommissionValue: "7.5",
  publicCatalogueEnabled: false,
};

describe("partner sales profile service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.partnershipFindUnique.mockResolvedValue(activePartnership);
    mocks.profileFindUnique.mockResolvedValue(existingProfile);
    mocks.profileFindFirst.mockResolvedValue(null);
    mocks.profileUpdate.mockResolvedValue({
      ...existingProfile,
      publicSlug: "acme-business",
    });
    mocks.profileCreate.mockResolvedValue(existingProfile);
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.auditFindFirst.mockResolvedValue(null);
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: true } });
    mocks.getBucket.mockResolvedValue({ data: { id: "product-images" } });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.verifyImage.mockResolvedValue(Buffer.from("verified-webp"));
    mocks.documentCreate.mockResolvedValue({
      id: "66666666-6666-4666-8666-666666666666",
    });
    mocks.requirePermission.mockResolvedValue(actor);
  });

  it("rejects missing required profile fields", async () => {
    await expect(
      savePartnerSalesProfile(
        { ...validInput, displayName: "", publicSlug: "" },
        actor,
      ),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("normalizes the public slug and rejects collisions", async () => {
    mocks.profileFindFirst.mockResolvedValue({ id: "another-profile" });

    await expect(savePartnerSalesProfile(validInput, actor)).rejects.toThrow(
      /slug.*already/i,
    );
    expect(mocks.profileFindFirst).toHaveBeenCalledWith({
      where: {
        publicSlug: "acme-business",
        partnershipId: { not: PARTNERSHIP_ID },
      },
      select: { id: true },
    });
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it.each([
    new File(["not-an-image"], "logo.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], "logo.png", {
      type: "image/png",
    }),
  ])("rejects an invalid logo type or size", async (logo) => {
    await expect(
      savePartnerSalesProfile({ ...validInput, logo }, actor),
    ).rejects.toThrow(/logo/i);
    expect(mocks.verifyImage).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects script-bearing footer copy and arbitrary style fields", async () => {
    await expect(
      savePartnerSalesProfile(
        { ...validInput, footerText: '<script src="https://evil.example/x.js">' },
        actor,
      ),
    ).rejects.toThrow(/plain text/i);

    await expect(
      savePartnerSalesProfile(
        { ...validInput, customCss: "body { display: none }" } as never,
        actor,
      ),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies callers without the dedicated profile approval permission", async () => {
    await expect(
      savePartnerSalesProfile(validInput, { ...actor, grants: [] }),
    ).rejects.toThrow(/permission/i);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("validates, re-encodes and records a logo through the document boundary", async () => {
    const logo = new File(["png-bytes"], "ACME logo.png", {
      type: "image/png",
    });

    await savePartnerSalesProfile({ ...validInput, logo }, actor);

    expect(mocks.verifyImage).toHaveBeenCalledWith(
      Buffer.from("png-bytes"),
      "image/png",
    );
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^partner-sales/${PARTNERSHIP_ID}/logo/.+\\.webp$`),
      ),
      Buffer.from("verified-webp"),
      { contentType: "image/webp", upsert: false },
    );
    expect(mocks.documentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mimeType: "image/webp",
        size: Buffer.byteLength("verified-webp"),
        isPrivate: false,
      }),
    });
    expect(mocks.profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          logoDocumentId: "66666666-6666-4666-8666-666666666666",
        }),
      }),
    );
  });

  it("writes before and after snapshots to the audit log in the save transaction", async () => {
    await savePartnerSalesProfile(validInput, actor);

    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      where: { id: PROFILE_ID },
      data: expect.objectContaining({
        publicSlug: "acme-business",
        displayName: "Acme Business",
        themePreset: "OCEAN",
      }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: ADMIN_ID,
        action: "partner-sales.profile.save",
        entityType: "PartnerSalesProfile",
        entityId: PROFILE_ID,
        before: expect.objectContaining({ publicSlug: "acme-business" }),
        after: expect.objectContaining({
          publicSlug: "acme-business",
          displayName: "Acme Business",
        }),
      }),
    });
  });

  it("denies a partner owner from approving their own sales profile", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...existingProfile,
      status: "ADMIN_REVIEW",
    });

    await expect(
      transitionPartnerSalesProfile(
        { partnershipId: PARTNERSHIP_ID, status: "ACTIVE" },
        { ...actor, user: { id: PARTNER_ID } },
      ),
    ).rejects.toThrow(/own.*profile/i);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it("denies the last profile editor from approving their own changes", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...existingProfile,
      status: "ADMIN_REVIEW",
    });
    mocks.auditFindFirst.mockResolvedValue({ actorId: ADMIN_ID });

    await expect(
      transitionPartnerSalesProfile(
        { partnershipId: PARTNERSHIP_ID, status: "ACTIVE" },
        actor,
      ),
    ).rejects.toThrow(/own.*changes/i);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it("denies activation for an inactive partnership or agreement", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...existingProfile,
      status: "ADMIN_REVIEW",
    });
    mocks.partnershipFindUnique.mockResolvedValue({
      ...activePartnership,
      status: "SUSPENDED",
    });

    await expect(
      transitionPartnerSalesProfile(
        { partnershipId: PARTNERSHIP_ID, status: "ACTIVE" },
        actor,
      ),
    ).rejects.toThrow(/active partnership.*agreement/i);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it("denies activation while the channel feature policy is disabled", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...existingProfile,
      status: "ADMIN_REVIEW",
    });
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: false } });

    await expect(
      transitionPartnerSalesProfile(
        { partnershipId: PARTNERSHIP_ID, status: "ACTIVE" },
        actor,
      ),
    ).rejects.toThrow(/enable.*channel/i);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it("activates a ready profile and audits the lifecycle transition", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...existingProfile,
      status: "ADMIN_REVIEW",
    });

    await transitionPartnerSalesProfile(
      {
        partnershipId: PARTNERSHIP_ID,
        status: "ACTIVE",
        reason: "Brand and legal details approved.",
      },
      actor,
    );

    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      where: { id: PROFILE_ID },
      data: expect.objectContaining({
        status: "ACTIVE",
        approvedById: ADMIN_ID,
        approvedAt: expect.any(Date),
      }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "partner-sales.profile.active",
        before: expect.objectContaining({ status: "ADMIN_REVIEW" }),
        after: expect.objectContaining({
          status: "ACTIVE",
          reason: "Brand and legal details approved.",
        }),
      }),
    });
  });
});

describe("partner sales profile POST route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    mocks.requirePermission.mockResolvedValue(actor);
    mocks.partnershipFindUnique.mockResolvedValue(activePartnership);
    mocks.profileFindUnique.mockResolvedValue(existingProfile);
    mocks.profileFindFirst.mockResolvedValue(null);
    mocks.profileUpdate.mockResolvedValue(existingProfile);
    mocks.auditCreate.mockResolvedValue({ id: "audit-route" });
    mocks.auditFindFirst.mockResolvedValue(null);
  });

  it("uses a stable POST and redirects only to the canonical profile page", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(validInput)) {
      if (key !== "partnershipId" && value !== false) form.set(key, String(value));
    }
    form.set("operation", "save");
    form.set("returnTo", "https://evil.example/phish");

    const response = await POST(
      new Request(
        `https://shop.example/api/admin/partner-sales/profiles/${PARTNERSHIP_ID}`,
        {
          method: "POST",
          headers: {
            origin: "https://shop.example",
            "sec-fetch-site": "same-origin",
          },
          body: form,
        },
      ),
      { params: Promise.resolve({ partnershipId: PARTNERSHIP_ID }) },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://shop.example/admin/partnerships/partners/${PARTNERSHIP_ID}/sales-channel?status=saved`,
    );
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      "partner_sales.profile.approve",
    );
  });

  it("preserves authorization denials instead of converting them to form errors", async () => {
    mocks.requirePermission.mockRejectedValue(new Error("redirect:/unauthorized"));
    const form = new FormData();
    form.set("operation", "approve");

    await expect(
      POST(
        new Request(
          `https://shop.example/api/admin/partner-sales/profiles/${PARTNERSHIP_ID}`,
          {
            method: "POST",
            headers: {
              origin: "https://shop.example",
              "sec-fetch-site": "same-origin",
            },
            body: form,
          },
        ),
        { params: Promise.resolve({ partnershipId: PARTNERSHIP_ID }) },
      ),
    ).rejects.toThrow("redirect:/unauthorized");
  });

  it("does not disclose unexpected storage or database diagnostics in redirects", async () => {
    mocks.profileUpdate.mockRejectedValue(
      new Error("postgres://secret-user:secret-password@private-db"),
    );
    const form = new FormData();
    for (const [key, value] of Object.entries(validInput)) {
      if (key !== "partnershipId" && value !== false) form.set(key, String(value));
    }
    form.set("operation", "save");

    const response = await POST(
      new Request(
        `https://shop.example/api/admin/partner-sales/profiles/${PARTNERSHIP_ID}`,
        {
          method: "POST",
          headers: {
            origin: "https://shop.example",
            "sec-fetch-site": "same-origin",
          },
          body: form,
        },
      ),
      { params: Promise.resolve({ partnershipId: PARTNERSHIP_ID }) },
    );

    const location = response.headers.get("location") ?? "";
    expect(location).toContain("message=The+sales+profile+could+not+be+updated.");
    expect(location).not.toContain("secret-user");
  });
});

describe("partner sales profile Admin page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue(actor);
    mocks.settingFindUnique.mockResolvedValue({ value: { enabled: true } });
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://assets.example/acme-logo.webp" },
    });
    mocks.partnershipFindUnique.mockResolvedValue({
      ...activePartnership,
      partnerNumber: "PN-ACME",
      owner: { name: "Alex Partner", email: "alex@acme.example" },
      sourceApplication: {
        registeredBusinessName: "Acme Business (Pty) Ltd",
        tradingName: "Acme Business",
        registrationNumber: "2026/123456/07",
        vatNumber: null,
        representativeName: "Alex Partner",
        representativePhone: "+27 11 555 0100",
      },
      salesProfile: {
        ...existingProfile,
        status: "ADMIN_REVIEW",
        logoDocument: {
          bucket: "product-images",
          path: "partner-sales/acme/logo/acme.webp",
        },
      },
    });
  });

  it("shows readiness, constrained preview, stable forms and review controls", async () => {
    const html = renderToStaticMarkup(
      await PartnerSalesChannelPage({
        params: Promise.resolve({ id: PARTNERSHIP_ID }),
        searchParams: Promise.resolve({ status: "saved" }),
      }),
    );

    expect(html).toContain("Sales channel profile");
    expect(html).toContain("Onboarding readiness");
    expect(html).toContain("Profile saved successfully");
    expect(html).toContain("Co-branded preview");
    expect(html).toContain("https://assets.example/acme-logo.webp");
    expect(html).toContain(
      `action="/api/admin/partner-sales/profiles/${PARTNERSHIP_ID}"`,
    );
    expect(html).toContain('method="post"');
    expect(html).toContain('encType="multipart/form-data"');
    expect(html).toContain("Approve &amp; activate");
    expect(html).toContain("Request changes");
    expect(html).toContain("Suspend channel");
    expect(html).not.toContain("customCss");
  });

  it("renders bounded route errors as visible text", async () => {
    const html = renderToStaticMarkup(
      await PartnerSalesChannelPage({
        params: Promise.resolve({ id: PARTNERSHIP_ID }),
        searchParams: Promise.resolve({
          status: "error",
          message: "Profile activation requires an active agreement.",
        }),
      }),
    );

    expect(html).toContain("Profile activation requires an active agreement.");
    expect(html).toContain('role="alert"');
  });
});
