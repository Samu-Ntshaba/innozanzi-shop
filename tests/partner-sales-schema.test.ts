import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
    const expectedRelations: Record<string, RegExp[]> = {
      PartnerSalesProfile: [
        /partnership\s+Partnership\s+@relation\([^\n]+onDelete: Restrict\)/,
      ],
      PartnerCatalogueAssignment: [
        /profile\s+PartnerSalesProfile\s+@relation\([^\n]+onDelete: Cascade\)/,
      ],
      PartnerClient: [
        /partnership\s+Partnership\s+@relation\([^\n]+onDelete: Restrict\)/,
      ],
      PartnerShowcase: [
        /profile\s+PartnerSalesProfile\s+@relation\([^\n]+onDelete: Cascade\)/,
      ],
      PartnerShowcaseItem: [
        /showcase\s+PartnerShowcase\s+@relation\([^\n]+onDelete: Cascade\)/,
      ],
      PartnerQuoteCase: [
        /partnership\s+Partnership\s+@relation\([^\n]+onDelete: Restrict\)/,
        /partnerClient\s+PartnerClient\s+@relation\([^\n]+onDelete: Restrict\)/,
      ],
      PartnerCommission: [
        /quoteCase\s+PartnerQuoteCase\s+@relation\([^\n]+onDelete: Restrict\)/,
        /order\s+Order\?\s+@relation\([^\n]+onDelete: SetNull\)/,
      ],
      PartnerCommissionEntry: [
        /commission\s+PartnerCommission\s+@relation\([^\n]+onDelete: Restrict\)/,
      ],
      PartnerPayoutBatch: [
        /partnership\s+Partnership\s+@relation\([^\n]+onDelete: Restrict\)/,
      ],
      PartnerPayoutItem: [
        /batch\s+PartnerPayoutBatch\s+@relation\([^\n]+onDelete: Restrict\)/,
        /commission\s+PartnerCommission\s+@relation\([^\n]+onDelete: Restrict\)/,
      ],
    };

    for (const [name, indexes] of Object.entries(expectedIndexes)) {
      const block = modelBlock(name);
      expect(block, `${name} UUID ownership`).toMatch(/\w+Id\s+String\??\s+.*@db\.Uuid/);
      for (const relation of expectedRelations[name] ?? []) {
        expect(block, `${name} relation ${relation}`).toMatch(relation);
      }
      for (const index of indexes) expect(block, `${name} ${index}`).toContain(index);
    }
  });

  it("stores financial values precisely and public secrets only as hashes", () => {
    const financialFields: Record<string, string[]> = {
      PartnerSalesProfile: ["defaultCommissionValue"],
      PartnerCommission: [
        "approvedBasis",
        "approvedValue",
        "quotedAmount",
        "currentAmount",
        "heldAmount",
        "adjustedAmount",
        "reversedAmount",
      ],
      PartnerCommissionEntry: ["amount", "balanceAfter"],
      PartnerPayoutBatch: ["total"],
      PartnerPayoutItem: ["amount"],
    };

    for (const [model, fields] of Object.entries(financialFields)) {
      const block = modelBlock(model);
      for (const field of fields) {
        expect(block, `${model}.${field} precision`).toMatch(
          new RegExp(`${field}\\s+Decimal\\s+.*@db\\.Decimal\\(19, 4\\)`),
        );
      }
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
      /CREATE UNIQUE INDEX "PartnerPayoutItem_active_commission_key" ON "PartnerPayoutItem"\("commissionId"\) WHERE "cancelledAt" IS NULL;/,
    );
    expect(migration).toContain('WHERE "cancelledAt" IS NULL');
    expect(migration).not.toContain('WHERE "status" <> \'CANCELLED\'');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });

  it("keeps the prior migration byte-stable and makes release safeguards forward-only", () => {
    const migration = source(migrationPath);
    const tableCreation = migration.indexOf(
      'CREATE TABLE "PartnerCatalogueAssignment"',
    );
    expect(tableCreation).toBeGreaterThanOrEqual(0);
    expect(createHash("sha256").update(migration).digest("hex")).toBe(
      "8da7d3165cc73fedb9068499c227c985246b106ecbf76741ac926131dd6b671d",
    );
    const safeguards = source(
      "prisma/migrations/20260924190000_partner_sales_release_safeguards/migration.sql",
    );
    for (const column of [
      'ADD COLUMN IF NOT EXISTS "sourceSnapshot" JSONB',
      'ADD COLUMN IF NOT EXISTS "clientSnapshot" JSONB',
      'ADD COLUMN IF NOT EXISTS "deliveryInstructions" TEXT',
      'ADD COLUMN IF NOT EXISTS "statementPayload" JSONB',
      'ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT',
    ]) {
      expect(safeguards).toContain(column);
    }
    expect(safeguards).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "PartnerPayoutBatch_idempotencyKey_key"',
    );
    expect(safeguards).toContain('ADD COLUMN IF NOT EXISTS "sourceSnapshot" JSONB');
    expect(safeguards).toContain('ADD COLUMN IF NOT EXISTS "clientSnapshot" JSONB');
    expect(safeguards).toContain('ADD COLUMN IF NOT EXISTS "deliveryInstructions" TEXT');
    expect(safeguards).toContain('ADD COLUMN IF NOT EXISTS "statementPayload" JSONB');
    expect(safeguards).toContain('ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT');
    expect(safeguards).toContain("ON CONFLICT (\"key\") DO UPDATE");
    expect(safeguards).toMatch(/enabled[^\n]*false/);
    expect(safeguards).not.toMatch(/DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|UPDATE\s+"PartnerCatalogueAssignment"/i);
    const additions = safeguards.match(/ALTER TABLE "[^"]+" ADD COLUMN IF NOT EXISTS "[^"]+"/g) ?? [];
    expect(additions).toHaveLength(6);
    expect(new Set(additions).size).toBe(additions.length);
    const conceptualColumns = new Set<string>();
    for (const addition of [...additions, ...additions]) {
      const column = addition.match(/ADD COLUMN IF NOT EXISTS "([^"]+)"/)?.[1];
      expect(column).toBeTruthy();
      conceptualColumns.add(column!);
    }
    expect(conceptualColumns.size).toBe(5);
    expect(source("scripts/backfill-partner-sales-release.ts")).toContain("mediaSnapshot");
  });
});
