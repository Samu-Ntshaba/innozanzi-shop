import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),find:vi.fn(),pdf:vi.fn()}));
vi.mock("@/domain/auth/session",()=>({getAuthContext:mocks.auth}));
vi.mock("@/lib/prisma",()=>({prisma:{invoice:{findUnique:mocks.find}}}));
vi.mock("@/domain/documents/commercial-pdf",()=>({commercialPdf:mocks.pdf}));
import { GET } from "@/app/api/invoices/[invoiceNumber]/pdf/route";
const request=()=>GET(new Request("https://shop.example/api/invoices/INV-1/pdf"),{params:Promise.resolve({invoiceNumber:"INV-1"})});
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({user:{id:"customer",email:"same@example.com"},grants:[],isSuperAdministrator:false});});
it("uses order ownership even when an invoice happens to match the viewer email",async()=>{
 mocks.find.mockResolvedValue({customerEmail:"same@example.com",order:{userId:"another-customer"}});
 expect((await request()).status).toBe(403);expect(mocks.pdf).not.toHaveBeenCalled();
});
it("rejects anonymous invoice access before fetching financial data",async()=>{
 mocks.auth.mockResolvedValue(null);expect((await request()).status).toBe(401);expect(mocks.find).not.toHaveBeenCalled();
});
