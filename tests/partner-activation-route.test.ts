import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ activate: vi.fn() }));
vi.mock("@/domain/auth/partner-activation", () => ({ activatePartnerInvitation: mocks.activate }));

import { POST } from "@/app/api/auth/activate-partner/route";

function request(fields: Record<string, string>) {
  return new Request("https://shop.innozanzi.co.za/api/auth/activate-partner", {
    method: "POST",
    body: new URLSearchParams(fields),
  });
}

describe("partner activation route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects an activated partner to their workspace", async () => {
    mocks.activate.mockResolvedValue({ ok: true, userId: "user-id" });
    const response = await POST(request({ token: "secret", email: "partner@example.com", password: "LongSecurePassword9", confirmPassword: "LongSecurePassword9" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/account/partner");
  });

  it("returns mismatched passwords to the setup page without consuming the link", async () => {
    mocks.activate.mockResolvedValue({ ok: false, error: "password" });
    const response = await POST(request({ token: "secret", email: "partner@example.com", password: "LongSecurePassword9", confirmPassword: "different" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/activate-account?token=secret&email=partner%40example.com&error=password");
  });

  it("does not echo an invalid or consumed secret into the redirect", async () => {
    mocks.activate.mockResolvedValue({ ok: false, error: "invalid" });
    const response = await POST(request({ token: "consumed-secret", email: "partner@example.com", password: "LongSecurePassword9", confirmPassword: "LongSecurePassword9" }));
    expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/activate-account?error=invalid");
  });
});
