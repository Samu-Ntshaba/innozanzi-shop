import { expect, it, vi } from "vitest";
const recommend=vi.hoisted(()=>vi.fn());
vi.mock("@/domain/ai-shopping/service",()=>({recommend}));
import { POST } from "@/app/api/ai-shopping/route";
it("never returns internal model or database error details in the error code",async()=>{
 vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://shop.example");
 recommend.mockRejectedValue(new Error("database connection failed: private credential details"));
 const response=await POST(new Request("https://shop.example/api/ai-shopping",{method:"POST",headers:{origin:"https://shop.example","content-type":"application/json"},body:JSON.stringify({message:"Gaming laptop"})}));
 expect(response.status).toBe(500);const body=await response.json();expect(body.code).toBe("UNAVAILABLE");expect(JSON.stringify(body)).not.toContain("credential");
});
