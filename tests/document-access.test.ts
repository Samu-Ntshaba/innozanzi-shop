import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),document:vi.fn(),sign:vi.fn()}));
vi.mock("@/domain/auth/session",()=>({getAuthContext:mocks.auth}));
vi.mock("@/lib/prisma",()=>({prisma:{uploadedDocument:{findUnique:mocks.document}}}));
vi.mock("@/lib/supabase",()=>({createSupabaseAdmin:()=>({storage:{from:()=>({createSignedUrl:mocks.sign})}})}));
import { GET } from "@/app/api/documents/[id]/route";
const request=()=>GET(new Request("https://shop.example/api/documents/test"),{params:Promise.resolve({id:"test"})});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({user:{id:"user1",email:"user@example.com",companyId:null},grants:[],isSuperAdministrator:false});mocks.document.mockResolvedValue({bucket:"private",path:"document.pdf",rfqSource:{rfq:{companyId:null}},transportDocuments:[],transportProofDocuments:[]});mocks.sign.mockResolvedValue({data:{signedUrl:"https://storage.example/signed"}});});
describe("private document access",()=>{
 it("does not treat two null company IDs as ownership",async()=>{expect((await request()).status).toBe(403);expect(mocks.sign).not.toHaveBeenCalled();});
 it("does not let catalogue editors download unrelated documents",async()=>{mocks.auth.mockResolvedValue({user:{id:"user1",email:"user@example.com",companyId:null},grants:[{key:"products.update",effect:"ALLOW"}],isSuperAdministrator:false});expect((await request()).status).toBe(403);});
 it("allows an actual RFQ company owner without caching the signed URL",async()=>{mocks.auth.mockResolvedValue({user:{id:"user1",email:"user@example.com",companyId:"company1"},grants:[],isSuperAdministrator:false});mocks.document.mockResolvedValue({bucket:"private",path:"document.pdf",rfqSource:{rfq:{companyId:"company1"}},transportDocuments:[],transportProofDocuments:[]});const response=await request();expect(response.status).toBe(307);expect(response.headers.get("cache-control")).toBe("private, no-store");});
 it("rejects anonymous access before looking up documents",async()=>{mocks.auth.mockResolvedValue(null);expect((await request()).status).toBe(401);expect(mocks.document).not.toHaveBeenCalled();});
});
