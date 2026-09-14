import { beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(), transaction: vi.fn(), upsert: vi.fn(), audit: vi.fn(),
  impact: vi.fn(), publish: vi.fn(), revalidate: vi.fn(), draft: vi.fn(),
}));
vi.mock("@/domain/auth/session", () => ({ requirePermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/domain/commerce/impact", () => ({ pricingImpact: mocks.impact }));
vi.mock("@/domain/commerce/draft", () => ({ getPricingDraft: mocks.draft }));
vi.mock("@/domain/commerce/publication", async importOriginal => ({
  ...await importOriginal<typeof import("@/domain/commerce/publication")>(), publishPricing: mocks.publish,
}));
import { previewCommerceSettings, saveCommerceSettings, saveDraftCommerceSettings } from "@/domain/commerce/actions";

function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries(DEFAULT_COMMERCE)) {
    data.set(key, key === "customCosts" ? JSON.stringify(value) : String(value));
  }
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue({ user: { id: "admin" } });
  mocks.transaction.mockImplementation(fn => fn({ siteSetting: { upsert: mocks.upsert }, auditLog: { create: mocks.audit } }));
  mocks.publish.mockResolvedValue({ version: "version-1" });
  mocks.draft.mockResolvedValue({settings:DEFAULT_COMMERCE,version:"draft-1",savedAt:"2026-09-14T12:00:00.000Z",savedBy:"Admin"});
});
it("saves draft and audit together without publishing active pricing", async () => {
  expect(await saveDraftCommerceSettings(form())).toMatchObject({ error: "", success: expect.stringContaining("Draft saved") });
  expect(mocks.transaction).toHaveBeenCalledOnce();
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: "commerce.pricing.draft" } }));
  expect(mocks.audit).toHaveBeenCalledOnce();
  expect(mocks.revalidate).toHaveBeenCalledWith("/admin/pricing");
  expect(mocks.publish).not.toHaveBeenCalled();
});
it("loads the latest persisted draft on every request", async () => {
  const {loadDraftCommerceSettings}=await import("@/domain/commerce/actions");
  const result=await loadDraftCommerceSettings();
  expect(result).toMatchObject({ok:true,draft:{version:"draft-1",settings:DEFAULT_COMMERCE}});
  expect(mocks.draft).toHaveBeenCalledOnce();
});
it("requires the exact persisted draft before publication", async () => {
  mocks.draft.mockResolvedValue({...await mocks.draft(),settings:{...DEFAULT_COMMERCE,handling:50}});
  const result=await saveCommerceSettings({error:"",success:""},form());
  expect(result.error).toContain("Save these exact settings");
  expect(mocks.publish).not.toHaveBeenCalled();
});
it("returns useful validation errors from preview without changing active pricing", async () => {
  const data = form(); data.set("customCosts", "invalid");
  expect(await previewCommerceSettings(data)).toMatchObject({ ok: false, error: expect.stringContaining("invalid data") });
  expect(mocks.impact).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("never reports a committed publication as rolled back if cache refresh fails", async () => {
  mocks.revalidate.mockImplementation(() => { throw new Error("cache unavailable"); });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = await saveCommerceSettings({ error: "", success: "" }, form());
  expect(result.error).toBe("");
  expect(result.success).toContain("was published");
  expect(result.success).toContain("version-1");
  log.mockRestore();
});
it("checks authorization before draft, preview and publication", async () => {
  mocks.permission.mockRejectedValue(new Error("forbidden"));
  await expect(saveDraftCommerceSettings(form())).rejects.toThrow("forbidden");
  await expect(previewCommerceSettings(form())).rejects.toThrow("forbidden");
  await expect(saveCommerceSettings({ error: "", success: "" }, form())).rejects.toThrow("forbidden");
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.publish).not.toHaveBeenCalled();
});
