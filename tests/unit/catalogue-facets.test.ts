import { describe, expect, it } from "vitest";
import { mergeCatalogueFacets } from "../../src/domain/catalogue/facets";

describe("catalogue facets", () => {
  it("deduplicates supplier and manual labels without changing the live supplier value", () => {
    expect(mergeCatalogueFacets(
      [{ name: "Dell", slug: "Dell" }, { name: "HP", slug: "HP" }],
      [{ name: "dell", slug: "dell" }],
    )).toEqual([{ name: "Dell", slug: "Dell" }, { name: "HP", slug: "HP" }]);
  });
});
