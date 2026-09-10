import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("shows the storefront footer throughout the account area", () => {
  const layout = readFileSync("src/app/account/layout.tsx", "utf8");
  expect(layout).toContain('import { StoreFooter } from "@/components/store/footer"');
  expect(layout).toContain("<StoreFooter />");
});
