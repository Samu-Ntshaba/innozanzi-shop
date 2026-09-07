import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),create:vi.fn(),rate:vi.fn()}));
vi.mock("@/domain/auth/session",()=>({getAuthContext:mocks.auth}));
vi.mock("@/domain/auth/rate-limit",()=>({consumeRateLimit:mocks.rate}));
vi.mock("@/lib/prisma",()=>({prisma:{recommendationEvent:{create:mocks.create}}}));
import { POST } from "@/app/api/recommendations/events/route";
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://shop.example");mocks.auth.mockResolvedValue(null);mocks.rate.mockResolvedValue({allowed:true});});
it("does not store browsing events or look up an account without analytics consent",async()=>{
 for(const cookie of ["", "innozanzi-consent=essential", "innozanzi-consent=analytics-invalid"]){const response=await POST(new Request("https://shop.example/api/recommendations/events",{method:"POST",headers:{origin:"https://shop.example","content-type":"application/json",cookie},body:'{"eventType":"VIEW","entityType":"PRODUCT"}'}));expect(response.status).toBe(200);expect(response.headers.get("set-cookie")).toContain("Max-Age=0");}
 expect(mocks.create).not.toHaveBeenCalled();expect(mocks.auth).not.toHaveBeenCalled();
});
it("stores a bounded event after explicit analytics consent",async()=>{const response=await POST(new Request("https://shop.example/api/recommendations/events",{method:"POST",headers:{origin:"https://shop.example","content-type":"application/json",cookie:"innozanzi-consent=analytics"},body:'{"eventType":"VIEW","entityType":"PRODUCT"}'}));expect(response.status).toBe(200);expect(mocks.create).toHaveBeenCalledOnce();});
