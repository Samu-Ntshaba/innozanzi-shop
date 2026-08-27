import { describe,expect,it } from "vitest";
import { brand } from "../src/config/brand";

describe("shared brand identity",()=>{
  it("keeps every experience under the Innozanzi name",()=>{
    expect(brand.shopName).toContain(brand.name);
    expect(brand.experiences.gaming).toContain(brand.name);
    expect(brand.experiences.pcBuilder).toContain(brand.name);
  });
  it("uses one canonical asset map",()=>Object.values(brand.assets).forEach(asset=>expect(asset).toMatch(/^\//)));
});
