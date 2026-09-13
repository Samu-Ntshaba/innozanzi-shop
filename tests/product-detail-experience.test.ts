import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("product detail experience", () => {
  it("shows verified catalogue facts instead of an unavailable-information dead end", () => {
    const page = readFileSync("src/app/(store)/supplier-products/[slug]/page.tsx", "utf8");
    expect(page).not.toContain("Product information is currently unavailable");
    expect(page).toContain("verifiedFacts");
    expect(page).toContain("ask us to confirm the full specification");
  });

  it("keeps the AI assistant as an icon-only launcher", () => {
    const assistant = readFileSync("src/components/store/ai-shopping-assistant.tsx", "utf8");
    expect(assistant).not.toContain("Not sure what to choose?");
    expect(assistant).not.toContain("innozanzi-ai-nudge-dismissed");
    expect(assistant).toContain("Innozanzi AI: ${label}");
  });

  it("pairs every product sharing option with an icon", () => {
    const share = readFileSync("src/components/store/product-share.tsx", "utf8");
    for (const icon of ["MessageCircle", "FacebookIcon", "LinkedInIcon", "XIcon", "Mail", "Copy"]) expect(share).toContain(icon);
  });
});
