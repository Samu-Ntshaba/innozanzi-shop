import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enqueueEmail: vi.fn(), stageEmail: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/integrations/email/outbox", () => ({ enqueueEmail: mocks.enqueueEmail, stageEmail: mocks.stageEmail }));
vi.mock("@/domain/auth/user-notifications", () => ({ notifySupportOfNewUser: mocks.notify }));

import { registerSalesPartner } from "@/domain/partnerships/register-partner";

const USER_ID = "33333333-3333-4333-8333-333333333333";

function database(mode: "NEW" | "EXISTING") {
  const userCreate = vi.fn().mockResolvedValue({
    id: USER_ID, email: "partner@example.com", name: "Partner Person", accountType: "CUSTOMER",
    customerProfile: { company: { id: "company-id", companyName: "Partner Trading", registrationNo: null, vatNumber: null } },
  });
  const userUpdate = vi.fn();
  const tx = {
    $queryRaw: vi.fn(),
    user: { create: userCreate, update: userUpdate, findUnique: vi.fn().mockResolvedValue(null) },
    userRole: { create: vi.fn() },
    userInvitation: { create: vi.fn() },
    partnershipApplication: { create: vi.fn().mockResolvedValue({ id: "application-id" }) },
    partnership: { create: vi.fn().mockResolvedValue({ id: "partnership-id", userId: USER_ID }), findFirst: vi.fn().mockResolvedValue(null) },
    partnershipStatusHistory: { createMany: vi.fn() },
    partnershipReview: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const existing = mode === "EXISTING" ? {
    id: USER_ID, email: "partner@example.com", name: "Partner Person", passwordHash: "keep-this-hash",
    customerProfile: { company: { id: "company-id", companyName: "Partner Trading", registrationNo: null, vatNumber: null } },
  } : null;
  const db = {
    user: { findFirst: vi.fn().mockResolvedValue(existing), findUnique: vi.fn().mockResolvedValue(null) },
    partnershipType: { findFirst: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", name: "Sales partner", track: "SALES", reviewFrequencyMonths: 12 }) },
    role: { findUnique: vi.fn().mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", name: "Customer" }) },
    partnership: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (work: (value: typeof tx) => unknown) => work(tx)),
  };
  return { db, tx, userCreate, userUpdate };
}

const base = {
  name: "Partner Person", email: "partner@example.com", phone: "0712345678",
  companyName: "Partner Trading", registrationNo: "", partnershipTypeId: "11111111-1111-4111-8111-111111111111",
  accountManagerId: "", status: "APPROVED" as const, reason: "Approved for sales programme.",
};

describe("registerSalesPartner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a passwordless invited account and queues its secure setup email", async () => {
    const { db, userCreate } = database("NEW");
    const result = await registerSalesPartner({ ...base, sourceMode: "NEW" }, { id: "admin-id", name: "Admin", email: "admin@example.com" }, db as never);
    expect(result).toEqual({ partnerId: "partnership-id", invited: true });
    expect(userCreate.mock.calls[0][0].data.passwordHash).toBeNull();
    expect(mocks.enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringContaining("sales partner") }), USER_ID);
  });

  it("links an existing customer without changing their password", async () => {
    const { db, userUpdate } = database("EXISTING");
    const result = await registerSalesPartner({ ...base, sourceMode: "EXISTING", userId: USER_ID }, { id: "admin-id", name: "Admin", email: "admin@example.com" }, db as never);
    expect(result).toEqual({ partnerId: "partnership-id", invited: false });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a second active partnership for an existing customer", async () => {
    const { db } = database("EXISTING");
    db.partnership.findFirst.mockResolvedValue({ id: "existing-partnership" });
    await expect(registerSalesPartner({ ...base, sourceMode: "EXISTING", userId: USER_ID }, { id: "admin-id", email: "admin@example.com" }, db as never)).rejects.toThrow("already has an active partnership");
  });

  it("keeps registration successful when immediate email delivery fails because the email was staged", async () => {
    const { db } = database("NEW");
    mocks.enqueueEmail.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(registerSalesPartner({ ...base, sourceMode: "NEW" }, { id: "admin-id", email: "admin@example.com" }, db as never)).resolves.toEqual({ partnerId: "partnership-id", invited: true });
    expect(mocks.stageEmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ subject: expect.stringContaining("sales partner") }), USER_ID);
  });

  it("rechecks for an active partnership after acquiring the transaction lock", async () => {
    const { db, tx } = database("EXISTING");
    tx.partnership.findFirst.mockResolvedValue({ id: "concurrent-partnership" });
    await expect(registerSalesPartner({ ...base, sourceMode: "EXISTING", userId: USER_ID }, { id: "admin-id", email: "admin@example.com" }, db as never)).rejects.toThrow("already has an active partnership");
    expect(tx.partnership.create).not.toHaveBeenCalled();
  });
});
