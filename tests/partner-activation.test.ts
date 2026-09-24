import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("new-password-hash"),
  createSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { userInvitation: { findUnique: mocks.findUnique }, $transaction: mocks.transaction },
}));
vi.mock("@/domain/auth/password", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("@/domain/auth/session", () => ({ createSession: mocks.createSession }));

import { activatePartnerInvitation, inspectPartnerActivation } from "@/domain/auth/partner-activation";
import { partnerInvitationEmail } from "@/integrations/email/templates";

const validInvitation = (overrides: Record<string, unknown> = {}) => ({
  id: "invitation-id",
  userId: "user-id",
  acceptedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  user: {
    id: "user-id",
    email: "partner@example.com",
    name: "Partner Person",
    status: "INVITED",
    deletedAt: null,
    partnerships: [{ id: "partnership-id", status: "APPROVED" }],
  },
  ...overrides,
});

describe("partner activation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends only a single-use setup link and never a password", () => {
    const message = partnerInvitationEmail({
      to: "partner@example.com",
      name: "Partner Person",
      company: "Partner Trading",
      token: "raw-secret-token",
      expiresAt: new Date("2026-09-25T10:00:00Z"),
    });
    expect(message.text).toContain("/activate-account?token=raw-secret-token");
    expect(message.text.toLowerCase()).not.toContain("temporary password");
    expect(message.html.toLowerCase()).not.toContain("temporary password");
  });

  it.each([
    ["expired", { expiresAt: new Date(Date.now() - 1) }],
    ["consumed", { acceptedAt: new Date() }],
    ["email mismatch", {}],
  ])("rejects an %s invitation", async (kind, overrides) => {
    mocks.findUnique.mockResolvedValue(validInvitation(overrides));
    const result = await inspectPartnerActivation("raw-token", kind === "email mismatch" ? "other@example.com" : "partner@example.com");
    expect(result).toEqual({ valid: false });
  });

  it("atomically consumes the invitation before activating and signing in", async () => {
    mocks.findUnique.mockResolvedValue(validInvitation());
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const userUpdate = vi.fn().mockResolvedValue({ id: "user-id" });
    mocks.transaction.mockImplementation(async (work: (tx: unknown) => unknown) => work({
      userInvitation: { updateMany },
      user: { update: userUpdate },
      session: { deleteMany: vi.fn() },
      auditLog: { create: vi.fn() },
    }));

    const result = await activatePartnerInvitation({
      token: "raw-token",
      email: "partner@example.com",
      password: "LongSecurePassword9",
      confirmPassword: "LongSecurePassword9",
    });

    expect(result).toEqual({ ok: true, userId: "user-id" });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ acceptedAt: null }) }));
    expect(mocks.createSession).toHaveBeenCalledWith("user-id");
  });
});
