import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth:vi.fn(), rate:vi.fn(), execute:vi.fn(), notification:vi.fn(), send:vi.fn() }));
vi.mock("@/domain/auth/session", () => ({getAuthContext:mocks.auth}));
vi.mock("@/domain/auth/rate-limit", () => ({consumeRateLimit:mocks.rate}));
vi.mock("@/lib/prisma", () => ({prisma:{$executeRaw:mocks.execute,notification:{findFirst:mocks.notification}}}));
vi.mock("@/integrations/email/outbox", () => ({enqueueEmail:mocks.send}));
import { GET, POST } from "@/app/api/ai-shopping/request/route";
const payload = { requestId:"11111111-1111-4111-8111-111111111111",name:"Guest",email:"guest@example.com",product:"Laptop",message:"<script>evil()</script>",reason:"NOT_FOUND",consent:true,transcript:[{role:"customer",text:"Laptop please"}] };
const request = (input = payload) => new Request("https://shop.example/api/ai-shopping/request",{method:"POST",headers:{origin:"https://shop.example","content-type":"application/json"},body:JSON.stringify(input)});
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://shop.example");vi.stubEnv("PRODUCT_REQUEST_EMAIL","support@example.com");mocks.auth.mockResolvedValue(null);mocks.rate.mockResolvedValue({allowed:true});mocks.execute.mockResolvedValue(1);mocks.send.mockResolvedValue({status:"SENT"}); });
describe("product request delivery", () => {
  it("uses authenticated identity instead of supplied contact identity", async () => {
    mocks.auth.mockResolvedValue({user:{id:"user-1",name:"Account owner",email:"owner@example.com"}});
    expect((await POST(request())).status).toBe(200);
    const email = mocks.send.mock.calls[0][0];
    expect(email.to).toBe("support@example.com");expect(email.text).toContain("owner@example.com");expect(email.text).not.toContain("guest@example.com");expect(email.html).not.toContain("<script>");expect(email.category).toBe("transactional");expect(email.text).toContain("Laptop please");
  });
  it("labels guest identity unverified and accepts the request", async () => {expect((await POST(request())).status).toBe(200);expect(mocks.send.mock.calls[0][0].text).toContain("Guest; contact details unverified");});
  it("blocks cross-site submissions without sending", async () => { const r=request();r.headers.set("origin","https://evil.example");expect((await POST(r)).status).toBe(403);expect(mocks.send).not.toHaveBeenCalled(); });
  it("rejects missing consent and missing guest email", async () => {expect((await POST(request({...payload,consent:false}))).status).toBe(400);expect((await POST(request({...payload,email:""}))).status).toBe(400);expect(mocks.send).not.toHaveBeenCalled();});
  it("does not send above the limit", async () => {mocks.rate.mockResolvedValue({allowed:false,retryAfterSeconds:90});const result=await POST(request());expect(result.status).toBe(429);expect(result.headers.get("retry-after")).toBe("90");expect(mocks.send).not.toHaveBeenCalled();});
  it("does not send duplicate reserved requests", async () => {mocks.execute.mockResolvedValue(0);mocks.notification.mockResolvedValue({status:"SENT"});expect((await POST(request())).status).toBe(200);expect(mocks.send).not.toHaveBeenCalled();mocks.notification.mockResolvedValue(null);expect((await POST(request())).status).toBe(409);});
  it("does not claim success when delivery fails", async () => {mocks.send.mockRejectedValue(new Error("provider secret diagnostic"));const result=await POST(request());expect(result.status).toBe(503);expect(await result.text()).not.toContain("secret diagnostic");});
  it("marks profile responses private and uncacheable", async () => {expect((await GET()).headers.get("cache-control")).toBe("private, no-store");});
});
