import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pinnacleCategory } from "@/integrations/pinnacle/categories";
import { parsePinnacleFeed, pinnacleBarcode, pinnacleFeatures, pinnacleNumber } from "@/integrations/pinnacle/parser";

const sample = `<?xml version="1.0"?><Pinnacle><PTH_XaltPL_Feed_SPINN038><LastUpdated>Thu, 10 Sep 2026 17:14:41 GMT</LastUpdated><StockCode>110200</StockCode><Brand>Port</Brand><BarcodeUPC>&#xA0;3567041102003</BarcodeUPC><BarcodeEAN>3567041102003</BarcodeEAN><ProdName>Port Belize Black 15.6&quot; Toploader Bag</ProdName><TopCat>TOP LOADER NOTEBOOK BAG</TopCat><ProdImg>https://example.test/bag.jpg</ProdImg><ProdPriceExclVAT>244.56</ProdPriceExclVAT><ProdQty>237</ProdQty><ProdExternalURL>https://example.test/bag</ProdExternalURL><category_tree>computing/bags-sleeves/toploaders</category_tree><highlight_feature_1_option>Bag Form Factor</highlight_feature_1_option><highlight_feature_1_value>Toploader</highlight_feature_1_value><highlight_feature_2_option/><highlight_feature_2_value/></PTH_XaltPL_Feed_SPINN038></Pinnacle>`;

describe("Pinnacle XML feed", () => {
  it("parses entities, prices, stock identifiers and feature pairs", () => {
    const row = parsePinnacleFeed(sample)[0];
    expect(row.ProdName).toContain('15.6"');
    expect(pinnacleNumber(row.ProdPriceExclVAT)).toBe(244.56);
    expect(pinnacleNumber(row.ProdQty)).toBe(237);
    expect(pinnacleBarcode(row)).toBe("3567041102003");
    expect(pinnacleFeatures(row)).toEqual({ "Bag Form Factor": "Toploader" });
  });

  it("maps Pinnacle categories into the shared storefront taxonomy", () => {
    expect(pinnacleCategory("computing/client-devices/notebooks", "")).toEqual({ category: "Computers", categoryPath: "Computers/Notebooks" });
    expect(pinnacleCategory("security/cctv-ip/cameras", "").category).toBe("Networking & security");
    expect(pinnacleCategory("computing/bags-sleeves/backpacks", "").category).toBe("Bags & luggage");
  });

  it("keeps the feed URL in environment configuration instead of source", () => {
    expect(readFileSync("src/integrations/pinnacle/feed.ts", "utf8")).not.toContain("productfeed/xml/id/");
  });
});
