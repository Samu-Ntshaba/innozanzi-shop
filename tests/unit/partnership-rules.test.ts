import { describe, expect, it } from "vitest";
import {
  ACTIVE_APPLICATION_STATUSES,
  canRespondToOffer,
  hasPartnerWorkspaceAccess,
  publicPartnerMessage,
} from "../../src/domain/partnerships/rules";

describe("partnership access and isolation rules", () => {
  it("grants the workspace only after approval", () => {
    expect(hasPartnerWorkspaceAccess("APPROVED")).toBe(true);
    expect(hasPartnerWorkspaceAccess("CONDITIONALLY_APPROVED")).toBe(true);
    expect(hasPartnerWorkspaceAccess("SUBMITTED")).toBe(false);
    expect(hasPartnerWorkspaceAccess("SUSPENDED")).toBe(false);
    expect(hasPartnerWorkspaceAccess("TERMINATED")).toBe(false);
  });

  it("classifies draft and review states as active applications", () => {
    expect(ACTIVE_APPLICATION_STATUSES).toContain("DRAFT");
    expect(ACTIVE_APPLICATION_STATUSES).toContain("UNDER_REVIEW");
    expect(ACTIVE_APPLICATION_STATUSES).not.toContain("APPROVED" as never);
    expect(ACTIVE_APPLICATION_STATUSES).not.toContain("REJECTED" as never);
  });

  it("only permits responses to live sent offers", () => {
    const now = new Date("2026-07-22T12:00:00Z");
    expect(canRespondToOffer("SENT", new Date("2026-07-23T12:00:00Z"), now)).toBe(true);
    expect(canRespondToOffer("DRAFT", new Date("2026-07-23T12:00:00Z"), now)).toBe(false);
    expect(canRespondToOffer("SENT", new Date("2026-07-21T12:00:00Z"), now)).toBe(false);
  });

  it("never projects internal partner messages to a customer", () => {
    expect(publicPartnerMessage({ id: "internal", isInternal: true, body: "supplier cost" })).toBeNull();
    expect(publicPartnerMessage({ id: "public", isInternal: false, body: "offer ready" })).toEqual({ id: "public", body: "offer ready" });
  });
});
