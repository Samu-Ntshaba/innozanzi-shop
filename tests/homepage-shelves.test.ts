import { describe,expect,it } from "vitest";
import { homepageShelf,homepageShelves } from "../src/domain/catalogue/homepage-shelves";

describe("homepage catalogue shelves",()=>{
  it("uses unique allowlisted keys",()=>expect(new Set(homepageShelves.map(shelf=>shelf.key)).size).toBe(homepageShelves.length));
  it("covers the broad stocked catalogue without inventing a server range",()=>{
    expect(homepageShelves.map(shelf=>shelf.key)).toEqual(expect.arrayContaining(["storage","components","charging","home-tech","appliances","software","mobile","printing"]));
    expect(homepageShelf("servers")).toBeUndefined();
  });
});
