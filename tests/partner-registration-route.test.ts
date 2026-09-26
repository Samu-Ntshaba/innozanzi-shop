import {beforeEach,describe,expect,it,vi}from"vitest";
const mocks=vi.hoisted(()=>({guard:vi.fn(),bounded:vi.fn(),permission:vi.fn(),register:vi.fn(),parse:vi.fn()}));
vi.mock("@/lib/security/request",()=>({browserMutationGuard:mocks.guard,boundedFormData:mocks.bounded}));
vi.mock("@/domain/auth/session",()=>({requirePermission:mocks.permission}));
vi.mock("@/domain/partnerships/register-partner",()=>({registerSalesPartnerSchema:{safeParse:mocks.parse},registerSalesPartner:mocks.register}));
import{POST}from"@/app/api/admin/partnerships/partners/register/route";

describe("sales partner registration route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.guard.mockReturnValue(null);});
  it("rejects cross-site mutation requests before reading the body or session",async()=>{
    mocks.guard.mockReturnValue(new Response("Forbidden",{status:403}));
    const response=await POST(new Request("https://shop.innozanzi.co.za/api/admin/partnerships/partners/register",{method:"POST"}));
    expect(response.status).toBe(403);
    expect(mocks.bounded).not.toHaveBeenCalled();
    expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("redirects duplicate registration to the public production origin behind an internal proxy",async()=>{
    process.env.NEXT_PUBLIC_SITE_URL="https://shop.innozanzi.co.za";
    mocks.permission.mockResolvedValue({user:{id:"admin-id",name:"Admin",email:"admin@example.com"}});
    mocks.bounded.mockResolvedValue(new FormData());
    mocks.parse.mockReturnValue({success:true,data:{}});
    mocks.register.mockRejectedValue(new Error("already has an active partnership"));
    const response=await POST(new Request("https://localhost:8080/api/admin/partnerships/partners/register",{method:"POST"}));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://shop.innozanzi.co.za/admin/partnerships/partners/new?error=duplicate");
  });
});
