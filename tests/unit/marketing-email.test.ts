import { describe, expect, it } from "vitest";
import {
  fallbackCampaignCopy,
  renderProductCampaign,
  type CampaignProduct,
} from "@/domain/communications/marketing-email";

const products: CampaignProduct[] = [{
  name: "Business Laptop <Pro>",
  slug: "business-laptop",
  sku: "LAP-001",
  shortDescription: "Reliable mobile productivity.",
  brand: "Example",
  category: "Laptops",
  imagePath: "/products/laptop.webp",
}];

describe("marketing email renderer", () => {
  it("builds branded product content with factual fallback copy", () => {
    const copy = fallbackCampaignCopy(products);
    const html = renderProductCampaign({ template: "SPOTLIGHT", copy, products });
    expect(copy.productBlurbs).toHaveLength(1);
    expect(html).toContain("Business Laptop &lt;Pro&gt;");
    expect(html).toContain("https://shop.innozanzi.co.za/products/business-laptop");
    expect(html).toContain("Availability and final pricing are confirmed");
    expect(html).not.toContain("Business Laptop <Pro>");
  });
});
