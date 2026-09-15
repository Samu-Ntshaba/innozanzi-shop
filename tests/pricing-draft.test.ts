import { beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";
const mocks=vi.hoisted(()=>({find:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{siteSetting:{findUnique:mocks.find},auditLog:{findFirst:mocks.audit}}}));
import { getPricingDraft } from "@/domain/commerce/draft";
beforeEach(()=>vi.resetAllMocks());
it("loads settings and their own saved version even if a later audit is visible",async()=>{
 const metadata={version:"draft-a",savedAt:"2026-09-14T10:00:00.000Z",savedBy:"Admin A"};
 mocks.find.mockResolvedValue({value:{...DEFAULT_COMMERCE,_draft:metadata},id:"row",updatedAt:new Date(metadata.savedAt)});
 mocks.audit.mockResolvedValue({id:"draft-b",createdAt:new Date("2026-09-14T11:00:00.000Z"),actor:{name:"Admin B"}});
 expect(await getPricingDraft()).toEqual({settings:DEFAULT_COMMERCE,...metadata});
});
it("continues to load previously saved drafts without embedded metadata",async()=>{
 mocks.find.mockResolvedValue({value:DEFAULT_COMMERCE,id:"row",updatedAt:new Date("2026-09-14T10:00:00.000Z")});
 mocks.audit.mockResolvedValue(null);
 expect(await getPricingDraft()).toMatchObject({settings:DEFAULT_COMMERCE,version:"row",savedBy:"Administrator"});
});
