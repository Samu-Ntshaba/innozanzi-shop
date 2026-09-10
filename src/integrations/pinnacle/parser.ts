import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

const text = z.preprocess(value => value === undefined || value === null ? "" : String(value).replace(/\u00a0/g, " ").trim(), z.string());
const rowSchema = z.object({
  LastUpdated: text,
  StockCode: text.pipe(z.string().min(1)),
  Brand: text,
  BarcodeUPC: text,
  BarcodeEAN: text,
  ProdName: text.pipe(z.string().min(1)),
  TopCat: text,
  ProdImg: text,
  ProdPriceExclVAT: text,
  ProdQty: text,
  ProdExternalURL: text,
  category_tree: text,
  highlight_feature_1_option: text,
  highlight_feature_1_value: text,
  highlight_feature_2_option: text,
  highlight_feature_2_value: text,
  highlight_feature_3_option: text,
  highlight_feature_3_value: text,
  highlight_feature_4_option: text,
  highlight_feature_4_value: text,
  highlight_feature_5_option: text,
  highlight_feature_5_value: text,
  highlight_feature_6_option: text,
  highlight_feature_6_value: text,
}).passthrough();

export type PinnacleFeedProduct = z.infer<typeof rowSchema>;

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
});

export function parsePinnacleFeed(input: string): PinnacleFeedProduct[] {
  const parsed = parser.parse(input) as { Pinnacle?: { PTH_XaltPL_Feed_SPINN038?: unknown } };
  const value = parsed.Pinnacle?.PTH_XaltPL_Feed_SPINN038;
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return z.array(rowSchema).min(1).parse(rows);
}

export function pinnacleNumber(value: string) {
  const number = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function pinnacleDate(value: string) {
  const date = new Date(value);
  return value && !Number.isNaN(date.valueOf()) ? date : null;
}

export function pinnacleBarcode(row: PinnacleFeedProduct) {
  return (row.BarcodeEAN || row.BarcodeUPC).replace(/\D/g, "") || null;
}

export function pinnacleFeatures(row: PinnacleFeedProduct) {
  const values: Record<string, string> = {};
  const fields = row as Record<string, unknown>;
  for (let index = 1; index <= 6; index++) {
    const option = String(fields[`highlight_feature_${index}_option`] ?? "").trim();
    const value = String(fields[`highlight_feature_${index}_value`] ?? "").trim();
    if (option && value) values[option] = value;
  }
  return values;
}
