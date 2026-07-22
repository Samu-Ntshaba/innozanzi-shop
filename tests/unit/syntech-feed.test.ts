import { describe, expect, it } from "vitest";
import { parseSyntechFeed } from "../../src/integrations/syntech/parser";

describe("Syntech feed parser", () => {
  it("normalizes CSV reseller feed columns", () => {
    const items = parseSyntechFeed('Syntech Item Code,Product Name,Category,Brand,Selling Price,Stock On Hand,Image URL\nABC-1,"Business Laptop",Computers,Dell,R 100.00,7,https://example.com/a.jpg', "text/csv");
    expect(items[0]).toMatchObject({ sku: "ABC-1", name: "Business Laptop", category: "Computers", brand: "Dell", price: 100, stock: 7 });
  });
  it("normalizes XML reseller feed fields", () => {
    const items = parseSyntechFeed("<products><product><itemcode>SSD-1</itemcode><name>Portable SSD</name><category>Storage</category><qty>4</qty></product></products>", "application/xml");
    expect(items[0]).toMatchObject({ sku: "SSD-1", name: "Portable SSD", category: "Storage", stock: 4 });
  });
});
