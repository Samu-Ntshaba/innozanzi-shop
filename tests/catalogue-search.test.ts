import { describe,expect,it } from "vitest";
import { catalogueSearchTerms } from "../src/domain/catalogue/search";

describe("catalogueSearchTerms",()=>{
  it("normalizes customer wording and includes individual useful tokens",()=>{
    expect(catalogueSearchTerms("  Gaming   Laptop! ")).toEqual(expect.arrayContaining(["gaming laptop","gaming","laptop","notebook"]));
  });
  it("maps common technology abbreviations to catalogue language",()=>{
    expect(catalogueSearchTerms("750W PSU")).toEqual(expect.arrayContaining(["750w psu","750w","psu","power supply"]));
    expect(catalogueSearchTerms("GPU")).toEqual(expect.arrayContaining(["gpu","graphics","graphics card"]));
  });
  it("does not manufacture terms for an empty search",()=>expect(catalogueSearchTerms("   ")).toEqual([]));
});
