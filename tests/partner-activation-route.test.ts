import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ activate: vi.fn(), guard: vi.fn(), bounded: vi.fn() }));
vi.mock("@/domain/auth/partner-activation", () => ({ activatePartnerInvitation: mocks.activate }));
vi.mock("@/lib/security/request",()=>({browserMutationGuard:mocks.guard,boundedFormData:mocks.bounded}));

import { POST } from "@/app/api/auth/activate-partner/route";

function request(fields: Record<string, string>,url="https://shop.innozanzi.co.za/api/auth/activate-partner") {
  return new Request(url, {
    method: "POST",
    body: new URLSearchParams(fields),
  });
}

describe("partner activation route", () => {
  beforeEach(() => {vi.clearAllMocks();mocks.guard.mockReturnValue(null);mocks.bounded.mockImplementation((request:Request)=>request.formData());});

  it("redirects an activated partner to their workspace", async () => {
    mocks.activate.mockResolvedValue({ ok: true, userId: "user-id" });
    const response = await POST(request({ token: "secret", email: "partner@example.com", password: "LongSecurePassword9", confirmPassword: "LongSecurePassword9" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/account/partner");
  });

  it("never redirects an activated partner to the proxy localhost origin",async()=>{
    process.env.NEXT_PUBLIC_SITE_URL="https://shop.innozanzi.co.za";
    mocks.activate.mockResolvedValue({ok:true,userId:"user-id"});
    const response=await POST(request({token:"secret",email:"partner@example.com",password:"LongSecurePassword9",confirmPassword:"LongSecurePassword9"},"https://localhost:8080/api/auth/activate-partner"));
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
    expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/activate-account?partner=1&error=invalid");
  });

  it("rejects cross-site mutation requests before consuming the token", async () => {
    mocks.guard.mockReturnValue(new Response("Forbidden",{status:403}));
    const response=await POST(request({token:"secret",email:"partner@example.com",password:"LongSecurePassword9",confirmPassword:"LongSecurePassword9"}));
    expect(response.status).toBe(403);
    expect(mocks.activate).not.toHaveBeenCalled();
  });
});
