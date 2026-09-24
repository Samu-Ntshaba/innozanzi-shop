import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  partnership: "11111111-1111-4111-8111-111111111111",
  otherPartnership: "99999999-9999-4999-8999-999999999999",
  profile: "22222222-2222-4222-8222-222222222222",
  showcase: "33333333-3333-4333-8333-333333333333",
  assignment: "44444444-4444-4444-8444-444444444444",
  item: "55555555-5555-4555-8555-555555555555",
  client: "66666666-6666-4666-8666-666666666666",
  case: "77777777-7777-4777-8777-777777777777",
  request: "88888888-8888-4888-8888-888888888888",
};

const mocks = vi.hoisted(() => {
  const tx = {
    partnerSalesProfile: { findUnique: vi.fn() },
    partnerCatalogueAssignment: { findMany: vi.fn() },
    partnerShowcase: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    partnerShowcaseItem: { createMany: vi.fn() },
    partnerClient: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    partnerQuoteCase: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    quotationRequest: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    ...tx,
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    rateLimit: vi.fn(),
    requirePermission: vi.fn(),
    guard: vi.fn(() => null),
    redirect: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    partnerSalesProfile: mocks.partnerSalesProfile,
    partnerCatalogueAssignment: mocks.partnerCatalogueAssignment,
    partnerShowcase: mocks.partnerShowcase,
    partnerShowcaseItem: mocks.partnerShowcaseItem,
    partnerClient: mocks.partnerClient,
    partnerQuoteCase: mocks.partnerQuoteCase,
    quotationRequest: mocks.quotationRequest,
    auditLog: mocks.auditLog,
    siteSetting: { findUnique: vi.fn().mockResolvedValue({ value: { enabled: true } }) },
  },
}));

vi.mock("@/domain/auth/rate-limit", () => ({
  consumeRateLimit: mocks.rateLimit,
}));
vi.mock("@/domain/auth/session", () => ({
  requirePermission: mocks.requirePermission,
}));
vi.mock("@/lib/security/request", () => ({
  boundedFormData: vi.fn(async (request: Request) => request.formData()),
  browserMutationGuard: mocks.guard,
  clientAddress: vi.fn(() => "198.51.100.8"),
}));
vi.mock("@/lib/public-site-url", () => ({
  publicSiteUrl: () => "https://shop.example",
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

import {
  PartnerEnquiryError,
  createPartnerEnquiry,
} from "@/domain/partner-sales/enquiries";
import {
  activateShowcase,
  createShowcase,
  resolveShowcase,
  revokeShowcase,
} from "@/domain/partner-sales/showcases";
import { POST } from "@/app/api/partner-sales/enquiries/route";

const actor = {
  user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  partnershipId: ids.partnership,
};

const activeProfile = {
  id: ids.profile,
  partnershipId: ids.partnership,
  publicSlug: "acme-business",
  status: "ACTIVE",
  publicCatalogueEnabled: true,
  approvedAt: new Date("2026-09-22"),
  approvedById: "99999999-9999-4999-8999-999999999999",
  suspendedAt: null,
  revokedAt: null,
  partnership: {
    status: "APPROVED",
    suspendedAt: null,
    terminatedAt: null,
    agreement: { status: "ACTIVE", expiresAt: new Date("2099-01-01") },
  },
};

const assignment = {
  id: ids.assignment,
  profileId: ids.profile,
  sourceType: "PRODUCT",
  sourceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  status: "ACTIVE",
  visibleFrom: null,
  visibleUntil: null,
  presentationTitle: "Business Notebook",
  presentationCopy: "For productive teams",
  mediaSnapshot: [{ url: "https://assets.example/notebook.webp", altText: "Notebook" }],
  availabilityFingerprint: "fingerprint-1",
};

const activeShowcase = {
  id: ids.showcase,
  publicId: "showcase-public-1",
  profileId: ids.profile,
  clientId: null,
  title: "Acme client selection",
  introduction: "A curated selection",
  status: "ACTIVE",
  visibility: "PUBLIC",
  accessTokenHash: null,
  expiresAt: null,
  revokedAt: null,
  profile: activeProfile,
  items: [
    {
      id: ids.item,
      sourceType: assignment.sourceType,
      sourceId: assignment.sourceId,
      titleSnapshot: assignment.presentationTitle,
      presentationCopySnapshot: assignment.presentationCopy,
      mediaSnapshot: assignment.mediaSnapshot,
      availabilityFingerprint: assignment.availabilityFingerprint,
    },
  ],
};

function enquiryInput(overrides: Record<string, unknown> = {}) {
  return {
    publicId: activeShowcase.publicId,
    companyName: "Client Company",
    contactName: "Client Contact",
    email: "client@example.com",
    phone: "+27 11 555 0100",
    items: [{ itemId: ids.item, quantity: 2 }],
    destination: "Johannesburg",
    timing: "Within 30 days",
    deliveryInstructions: "Call before delivery",
    consent: true,
    idempotencyKey: "client-request-1",
    ...overrides,
  };
}

describe("partner showcases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue(actor);
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.partnerSalesProfile.findUnique.mockResolvedValue(activeProfile);
    mocks.partnerCatalogueAssignment.findMany.mockResolvedValue([assignment]);
    mocks.partnerShowcase.findUnique.mockResolvedValue(activeShowcase);
    mocks.partnerShowcase.findFirst.mockResolvedValue(activeShowcase);
    mocks.partnerShowcase.create.mockResolvedValue({ ...activeShowcase, status: "DRAFT" });
    mocks.partnerShowcase.update.mockResolvedValue({ ...activeShowcase, status: "REVOKED" });
    mocks.partnerShowcaseItem.createMany.mockResolvedValue({ count: 1 });
  });

  it("stores only a hash for a private showcase and returns the plaintext token once", async () => {
    mocks.partnerClient.findUnique.mockResolvedValue({ id: ids.client, partnershipId: ids.partnership });
    const result = await createShowcase(
      {
        partnershipId: ids.partnership,
        profileId: ids.profile,
        title: "Client selection",
        introduction: "Choose a solution",
        visibility: "CLIENT_SPECIFIC",
        clientId: ids.client,
        assignmentIds: [ids.assignment],
      },
      actor,
    );

    expect(result.accessToken).toEqual(expect.any(String));
    expect((result as Record<string, unknown>).accessTokenHash).toBeUndefined();
    expect(mocks.partnerShowcase.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ accessToken: expect.anything() }) }),
    );
    expect(mocks.partnerShowcase.create.mock.calls[0][0].data.accessTokenHash).toEqual(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it("does not create a showcase from a withdrawn or cross-partner catalogue assignment", async () => {
    mocks.partnerCatalogueAssignment.findMany.mockResolvedValue([]);
    await expect(
      createShowcase(
        {
          partnershipId: ids.partnership,
          profileId: ids.profile,
          title: "Invalid selection",
          visibility: "PUBLIC",
          assignmentIds: [ids.assignment],
        },
        actor,
      ),
    ).rejects.toThrow(PartnerEnquiryError);
  });

  it("rejects private token tampering, expiry, and revocation", async () => {
    const privateShowcase = {
      ...activeShowcase,
      visibility: "CLIENT_SPECIFIC",
      accessTokenHash: "a".repeat(64),
      expiresAt: new Date("2099-01-01"),
    };
    mocks.partnerShowcase.findUnique.mockResolvedValue(privateShowcase);
    await expect(resolveShowcase(activeShowcase.publicId, "tampered-token")).resolves.toBeNull();

    mocks.partnerShowcase.findUnique.mockResolvedValue({
      ...privateShowcase,
      expiresAt: new Date("2020-01-01"),
    });
    await expect(resolveShowcase(activeShowcase.publicId, "anything")).resolves.toBeNull();

    mocks.partnerShowcase.findUnique.mockResolvedValue({
      ...privateShowcase,
      expiresAt: null,
      revokedAt: new Date("2026-09-23"),
      status: "REVOKED",
    });
    await expect(resolveShowcase(activeShowcase.publicId, "anything")).resolves.toBeNull();
  });

  it("activates and revokes a showcase through explicit lifecycle operations", async () => {
    const activated = await activateShowcase(ids.showcase, actor);
    expect(activated.accessToken).toBeUndefined();
    expect(mocks.partnerShowcase.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ids.showcase }, data: expect.objectContaining({ status: "ACTIVE" }) }),
    );
    await revokeShowcase(ids.showcase, actor, "Client link no longer needed");
    expect(mocks.partnerShowcase.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REVOKED", revokedAt: expect.any(Date) }) }),
    );
  });
});

describe("anonymous partner enquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.partnerShowcase.findUnique.mockResolvedValue(activeShowcase);
    mocks.partnerClient.findUnique.mockResolvedValue(null);
    mocks.partnerClient.create.mockResolvedValue({ id: ids.client, partnershipId: ids.partnership });
    mocks.partnerQuoteCase.findFirst.mockResolvedValue(null);
    mocks.partnerQuoteCase.create.mockResolvedValue({ caseNumber: "PC-CLIENT-REQUEST-1" });
    mocks.quotationRequest.findUnique.mockResolvedValue(null);
    mocks.quotationRequest.create.mockResolvedValue({ id: ids.request, requestNumber: "QR-CLIENT-REQUEST-1" });
  });

  it("requires consent, bounds input, and charges a public rate-limit hook", async () => {
    await expect(createPartnerEnquiry(enquiryInput({ consent: false }))).rejects.toThrow("consent");
    await expect(
      createPartnerEnquiry(enquiryInput({ deliveryInstructions: "x".repeat(2001) })),
    ).rejects.toThrow(PartnerEnquiryError);
    mocks.rateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    await expect(createPartnerEnquiry(enquiryInput())).rejects.toThrow("Too many");
    expect(mocks.rateLimit).toHaveBeenCalledWith(expect.stringContaining("partner-enquiry"), expect.any(Number), expect.any(Number));
  });

  it("creates one case and returns the same case for a duplicate idempotency key", async () => {
    const first = await createPartnerEnquiry(enquiryInput());
    mocks.quotationRequest.findUnique.mockResolvedValue({ id: ids.request });
    mocks.partnerQuoteCase.findFirst.mockResolvedValue({ caseNumber: first.caseNumber, partnerClientId: ids.client });
    const second = await createPartnerEnquiry(enquiryInput());
    expect(first.caseNumber).toBe("PC-CLIENT-REQUEST-1");
    expect(second).toEqual(first);
    expect(mocks.partnerQuoteCase.create).toHaveBeenCalledTimes(1);
  });

  it("scopes the anonymous client record to the showcase partnership", async () => {
    await createPartnerEnquiry(enquiryInput());
    expect(mocks.partnerClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ partnershipId: ids.partnership }) }),
    );
  });
});

describe("partner enquiry route", () => {
  it("uses bounded same-origin form handling and redirects to a non-sensitive confirmation", async () => {
    const body = new URLSearchParams({
      publicId: activeShowcase.publicId,
      partnerSlug: "acme-business",
      companyName: "Client Company",
      contactName: "Client Contact",
      email: "client@example.com",
      phone: "+27 11 555 0100",
      items: JSON.stringify([{ itemId: ids.item, quantity: 1 }]),
      destination: "Johannesburg",
      timing: "Within 30 days",
      deliveryInstructions: "Call before delivery",
      consent: "on",
      idempotencyKey: "route-request-1",
    });
    mocks.partnerShowcase.findUnique.mockResolvedValue(activeShowcase);
    mocks.partnerClient.findUnique.mockResolvedValue(null);
    mocks.partnerClient.create.mockResolvedValue({ id: ids.client, partnershipId: ids.partnership });
    mocks.partnerQuoteCase.findFirst.mockResolvedValue(null);
    mocks.partnerQuoteCase.create.mockResolvedValue({ caseNumber: "PC-ROUTE-1" });
    mocks.quotationRequest.findUnique.mockResolvedValue(null);
    mocks.quotationRequest.create.mockResolvedValue({ id: ids.request, requestNumber: "QR-ROUTE-1" });
    const response = await POST(
      new Request("https://shop.example/api/partner-sales/enquiries", {
        method: "POST",
        headers: {
          origin: "https://shop.example",
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/\/p\/acme-business\/s\/showcase-public-1\?submitted=1$/);
    expect(response.headers.get("location")).not.toContain("email");
    expect(response.headers.get("location")).not.toContain("token");
  });
});

describe("showcase pages", () => {
  it("keeps management and public surfaces on the approved showcase routes", () => {
    const management = readFileSync("src/app/account/partner/showcases/page.tsx", "utf8");
    const create = readFileSync("src/app/account/partner/showcases/new/page.tsx", "utf8");
    const publicPage = readFileSync("src/app/(store)/p/[partnerSlug]/s/[publicId]/page.tsx", "utf8");
    const showcaseRoute = readFileSync("src/app/api/partner-sales/showcases/route.ts", "utf8");
    expect(management).toContain("requirePartnerSalesContext");
    expect(create).toContain("New showcase");
    expect(showcaseRoute).toContain("createShowcase");
    expect(publicPage).toContain("resolveShowcase");
    expect(publicPage).not.toMatch(/dangerouslySetInnerHTML/);
  });
});
