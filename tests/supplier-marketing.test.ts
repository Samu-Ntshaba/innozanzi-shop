import { describe,expect,it } from "vitest";
import { supplierBrandAsset,supplierBrandAssets } from "@/config/supplier-marketing";

describe("supplier marketing assets",()=>{
  it("keeps one canonical entry per brand",()=>expect(new Set(supplierBrandAssets.map(asset=>asset.name.toLowerCase())).size).toBe(supplierBrandAssets.length));
  it("keeps one canonical file path per asset",()=>expect(new Set(supplierBrandAssets.map(asset=>asset.logo)).size).toBe(supplierBrandAssets.length));
  it("matches brand names without case sensitivity",()=>expect(supplierBrandAsset("winx")?.name).toBe("WINX"));
  it("serves every asset from a local marketing path",()=>supplierBrandAssets.forEach(asset=>expect(asset.logo).toMatch(/^\/marketing\//)));
  it("has useful alternative-text names for every visible logo",()=>supplierBrandAssets.forEach(asset=>expect(asset.name.trim().length).toBeGreaterThan(1)));
});
