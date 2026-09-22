import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
  schema = source("prisma/schema.prisma"),
  migrationPath =
    "prisma/migrations/20260922190000_partner_sales_channel/migration.sql";

const modelBlock = (name: string) => {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  expect(match, `model ${name}`).not.toBeNull();
  return match?.[1] ?? "";
};

const enumBlock = (name: string) => {
  const match = schema.match(new RegExp(`enum ${name} \\{([\\s\\S]*?)\\n\\}`));
  expect(match, `enum ${name}`).not.toBeNull();
  return match?.[1] ?? "";
};

describe("partner sales persistence contract", () => {
  it("defines every partner-channel model", () => {
    for (const name of [
      "PartnerSalesProfile",
      "PartnerCatalogueAssignment",
      "PartnerClient",
      "PartnerShowcase",
      "PartnerShowcaseItem",
      "PartnerQuoteCase",
      "PartnerCommission",
      "PartnerCommissionEntry",
      "PartnerPayoutBatch",
      "PartnerPayoutItem",
    ]) {
      expect(schema, name).toContain(`model ${name} {`);
    }
  });

  it("pins the approved profile, pipeline, commission, and payout states", () => {
    const expectedStates: Record<string, string[]> = {
      PartnerSalesProfileStatus: [
        "INVITED",
        "PROFILE_INCOMPLETE",
        "ADMIN_REVIEW",
        "ACTIVE",
        "CHANGES_REQUIRED",
        "SUSPENDED",
        "CLOSED",
      ],
      PartnerCommissionMethod: ["PERCENTAGE", "FIXED_AMOUNT"],
      PartnerCatalogueSourceType: [
        "PRODUCT",
        "SUPPLIER_CATALOGUE_PRODUCT",
        "COMBO",
        "CAMPAIGN",
      ],
      PartnerCatalogueAssignmentStatus: ["ACTIVE", "WITHDRAWN"],
      PartnerShowcaseStatus: ["DRAFT", "ACTIVE", "EXPIRED", "REVOKED"],
      PartnerShowcaseVisibility: ["PUBLIC", "CLIENT_SPECIFIC"],
      PartnerQuoteCaseStatus: [
        "NEW_ENQUIRY",
        "QUALIFIED",
        "PRICING_REQUESTED",
        "INNOZANZI_REVIEW",
        "PARTNER_REVIEW",
        "SENT_TO_CLIENT",
        "ACCEPTED",
        "PAYMENT_PENDING",
        "PAID",
        "ORDER_IN_PROGRESS",
        "COMPLETED",
        "REVISION_REQUESTED",
        "DECLINED",
        "EXPIRED",
        "CANCELLED",
        "REFUNDED",
        "DISPUTED",
      ],
      PartnerCommissionStatus: [
        "ESTIMATED",
        "LOCKED_ON_PAYMENT",
        "PENDING_COMPLETION",
        "PAYABLE",
        "HELD",
        "ADJUSTED",
        "REVERSED",
        "INCLUDED_IN_BATCH",
        "PAID",
      ],
      PartnerCommissionEntryType: [
        "ESTIMATE",
        "LOCK",
        "HOLD",
        "RELEASE",
        "ADJUSTMENT",
        "REVERSAL",
        "BATCHED",
        "PAYMENT",
        "CORRECTION",
      ],
      PartnerPayoutBatchStatus: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "PAID",
        "CANCELLED",
      ],
      PartnerPayoutItemStatus: ["ACTIVE", "CANCELLED"],
    };

    for (const [name, states] of Object.entries(expectedStates)) {
      const block = enumBlock(name);
      for (const state of states) expect(block, `${name}.${state}`).toContain(state);
    }
  });

  it("uses UUID ownership links, explicit deletes, and queue indexes", () => {
    const expectedIndexes: Record<string, string[]> = {
      PartnerSalesProfile: ["@@index([status, publicCatalogueEnabled])"],
      PartnerCatalogueAssignment: [
        "@@index([profileId, status, visibleFrom, visibleUntil])",
      ],
      PartnerClient: ["@@index([partnershipId, updatedAt])"],
      PartnerShowcase: [
        "@@index([profileId, status, updatedAt])",
        "@@index([status, expiresAt])",
      ],
      PartnerShowcaseItem: ["@@index([showcaseId, sortOrder])"],
      PartnerQuoteCase: [
        "@@index([partnershipId, status, updatedAt])",
        "@@index([assignedPartnerUserId, status])",
        "@@index([innozanziOwnerId, status])",
      ],
      PartnerCommission: [
        "@@index([partnershipId, status, updatedAt])",
        "@@index([status, eligibilityAt])",
      ],
      PartnerCommissionEntry: ["@@index([commissionId, createdAt])"],
      PartnerPayoutBatch: [
        "@@index([partnershipId, status, periodStart, periodEnd])",
        "@@index([status, periodEnd])",
      ],
      PartnerPayoutItem: ["@@index([commissionId, status])"],
    };

    for (const [name, indexes] of Object.entries(expectedIndexes)) {
      const block = modelBlock(name);
      expect(block, `${name} UUID ownership`).toMatch(/\w+Id\s+String\??\s+.*@db\.Uuid/);
      expect(block, `${name} explicit relation delete`).toMatch(
        /@relation\([^\n]+onDelete: (Cascade|Restrict|SetNull)\)/,
      );
      for (const index of indexes) expect(block, `${name} ${index}`).toContain(index);
    }
  });

  it("stores financial values precisely and public secrets only as hashes", () => {
    for (const model of [
      "PartnerSalesProfile",
      "PartnerCommission",
      "PartnerCommissionEntry",
      "PartnerPayoutBatch",
      "PartnerPayoutItem",
    ]) {
      expect(modelBlock(model), `${model} money precision`).toContain(
        "@db.Decimal(19, 4)",
      );
    }

    const showcase = modelBlock("PartnerShowcase");
    expect(showcase).toMatch(/accessTokenHash\s+String\?/);
    expect(showcase).not.toMatch(/\n\s*(accessToken|plainToken)\s+String/);
  });

  it("links existing commerce rows without making historical rows invalid", () => {
    for (const model of ["QuotationRequest", "Quotation", "Order", "Payment"]) {
      const block = modelBlock(model);
      expect(block, `${model}.partnerQuoteCaseId`).toMatch(
        /partnerQuoteCaseId\s+String\?\s+(?:@unique\s+)?@db\.Uuid/,
      );
      expect(block, `${model}.partnerQuoteCase`).toMatch(
        /partnerQuoteCase\s+PartnerQuoteCase\?\s+@relation\([^\n]+onDelete: SetNull\)/,
      );
    }

    for (const model of ["QuotationRequest", "Quotation"]) {
      const block = modelBlock(model);
      expect(block, `${model}.partnerSalesProfileId`).toMatch(
        /partnerSalesProfileId\s+String\?\s+@db\.Uuid/,
      );
    }
  });

  it("enforces the one-to-one financial and conversion invariants", () => {
    expect(modelBlock("PartnerSalesProfile")).toMatch(
      /partnershipId\s+String\s+@unique\s+@db\.Uuid/,
    );
    expect(modelBlock("Order")).toMatch(
      /partnerQuoteCaseId\s+String\?\s+@unique\s+@db\.Uuid/,
    );
    expect(modelBlock("PartnerCommission")).toMatch(
      /orderId\s+String\?\s+@unique\s+@db\.Uuid/,
    );
  });

  it("ships an additive migration with tables, indexes, relations, and partial payout uniqueness", () => {
    const migration = source(migrationPath);

    for (const table of [
      "PartnerSalesProfile",
      "PartnerCatalogueAssignment",
      "PartnerClient",
      "PartnerShowcase",
      "PartnerShowcaseItem",
      "PartnerQuoteCase",
      "PartnerCommission",
      "PartnerCommissionEntry",
      "PartnerPayoutBatch",
      "PartnerPayoutItem",
    ]) {
      expect(migration, table).toContain(`CREATE TABLE "${table}"`);
      expect(migration, `${table} foreign key`).toContain(
        `ALTER TABLE "${table}" ADD CONSTRAINT`,
      );
    }

    expect(migration).toContain("CREATE INDEX");
    expect(migration).toContain("FOREIGN KEY");
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "PartnerPayoutItem_active_commission_key"[\s\S]+WHERE "cancelledAt" IS NULL/,
    );
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
