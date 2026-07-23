import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, invitationExpiry } from "./invitation-utils";
import { passwordSchema } from "@/schemas/auth";

describe("user invitations", () => {
  it("generates a policy-compliant temporary password", () => {
    expect(passwordSchema.safeParse(generateTemporaryPassword()).success).toBe(true);
  });

  it("caps invitation lifetime at seven days", () => {
    const hours = (invitationExpiry(999).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(167.9);
    expect(hours).toBeLessThanOrEqual(168);
  });
});
