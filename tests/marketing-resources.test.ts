import { describe,expect,it } from "vitest";
import { marketingResources,renderMarketingResource } from "../src/domain/marketing/resources";
import { createZip } from "../src/lib/zip";

describe("marketing resource pack",()=>{
  it("contains the complete handover set with unique download slugs",()=>{
    expect(marketingResources).toHaveLength(6);
    expect(new Set(marketingResources.map(item=>item.slug)).size).toBe(marketingResources.length);
    expect(marketingResources.map(item=>item.slug)).toContain("marketing-manager-brief");
    expect(marketingResources.map(item=>item.slug)).toContain("seo-content-framework");
  });
  it("renders every document with brand, founder and publishing safeguards",()=>{
    for(const resource of marketingResources){const html=renderMarketingResource(resource);expect(html).toContain("innozanzi-shop-logo-header-v2.png");expect(html).toContain("Simukelo Ntshaba");expect(html).toContain("Verify product, price and availability data");expect(html).not.toContain("undefined")}
  });
  it("escapes untrusted document content",()=>{
    const html=renderMarketingResource({slug:"test",title:"<script>alert(1)</script>",summary:"safe",audience:"test",sections:[{heading:"Heading",body:"<b>unsafe</b>"}]});
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;b&gt;unsafe&lt;/b&gt;");
  });
  it("creates a downloadable ZIP containing the resource files",()=>{
    const zip=createZip(marketingResources.map(item=>({name:`documents/${item.slug}.html`,content:renderMarketingResource(item)})));
    expect(Buffer.from(zip).subarray(0,4).toString("hex")).toBe("504b0304");
    expect(Buffer.from(zip).toString("utf8")).toContain("documents/company-story-positioning.html");
  });
});
