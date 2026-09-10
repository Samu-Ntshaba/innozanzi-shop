import type { Prisma } from "@/generated/prisma/client";
import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { prisma } from "@/lib/prisma";
import { catalogueSearchTerms, catalogueSuggestionScore } from "./search";
import { productHasCapability, type CatalogueCapability } from "./taxonomy";

export type CatalogueSuggestion = {
  id: string;
  name: string;
  href: string;
  image: string;
  brand: string | null;
  category: string;
  sku: string;
};

const clean = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 80);
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const capability = (query: string): CatalogueCapability | null => {
  const value = query.toLowerCase();
  if (/\b(la|lap|lab|laptop|notebook)/.test(value)) return "LAPTOP";
  if (/\b(mon|monitor|screen|display)/.test(value)) return "MONITOR";
  if (/\b(print|printer)/.test(value)) return "PRINTER";
  if (/\b(ssd|nvme|storage|hard drive)/.test(value)) return "STORAGE";
  if (/\b(router|wifi|wi-fi)/.test(value)) return "ROUTER";
  return null;
};

const supplierFields = (term: string): Prisma.SupplierCatalogueProductWhereInput[] => [
  { name: { contains: term, mode: "insensitive" } }, { supplierSku: { contains: term, mode: "insensitive" } },
  { manufacturerSku: { contains: term, mode: "insensitive" } }, { barcode: { contains: term, mode: "insensitive" } },
  { brand: { contains: term, mode: "insensitive" } }, { category: { contains: term, mode: "insensitive" } },
  { categoryPath: { contains: term, mode: "insensitive" } },
];
const manualFields = (term: string): Prisma.ProductWhereInput[] => [
  { name: { contains: term, mode: "insensitive" } }, { sku: { contains: term, mode: "insensitive" } },
  { brand: { name: { contains: term, mode: "insensitive" } } },
  { category: { name: { contains: term, mode: "insensitive" } } },
];

export async function catalogueSuggestions(input: string, limit = 8): Promise<CatalogueSuggestion[]> {
  const query = clean(input);
  if (query.length < 2) return [];
  const tokens = query.toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").split(" ").filter(Boolean);
  const variants = tokens.map(token => [...new Set(catalogueSearchTerms(token).filter(term => !term.includes(" ")))]);
  const prefixes = [...new Set(tokens.map(token => token.slice(0, 2)).filter(term => term.length === 2))];
  const supplierPrimary: Prisma.SupplierCatalogueProductWhereInput = { AND: variants.map(group => ({ OR: group.flatMap(supplierFields) })) };
  const manualPrimary: Prisma.ProductWhereInput = { AND: variants.map(group => ({ OR: group.flatMap(manualFields) })) };
  const supplierEligibility = await sellableSupplierWhere();
  const [supplierExact, manualExact, supplierFallback, manualFallback] = await Promise.all([
    prisma.supplierCatalogueProduct.findMany({
      where: { ...supplierEligibility, ...supplierPrimary }, take: 100, orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, supplierSku: true, manufacturerSku: true, barcode: true, brand: true, category: true, categoryPath: true, images: true },
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isTestData: false, stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] }, images: { some: { isPrimary: true } }, ...manualPrimary }, take: 50, orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, sku: true, brand: { select: { name: true } }, category: { select: { name: true } }, images: { where: { isPrimary: true }, take: 1, select: { path: true } } },
    }),
    prisma.supplierCatalogueProduct.findMany({
      where: { ...supplierEligibility, OR: prefixes.flatMap(supplierFields) }, take: 100, orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, supplierSku: true, manufacturerSku: true, barcode: true, brand: true, category: true, categoryPath: true, images: true },
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isTestData: false, stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] }, images: { some: { isPrimary: true } }, OR: prefixes.flatMap(manualFields) }, take: 50, orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, sku: true, brand: { select: { name: true } }, category: { select: { name: true } }, images: { where: { isPrimary: true }, take: 1, select: { path: true } } },
    }),
  ]);
  const supplier = [...new Map([...supplierExact, ...supplierFallback].map(row => [row.id, row])).values()];
  const manual = [...new Map([...manualExact, ...manualFallback].map(row => [row.id, row])).values()];
  const primaryIds = new Set([...supplierExact.map(row => `supplier:${row.id}`), ...manualExact.map(row => `internal:${row.id}`)]);
  const intent = capability(query);
  const ranked = [
    ...supplier.map(row => ({
      score: catalogueSuggestionScore({ name: row.name, sku: row.supplierSku, manufacturerSku: row.manufacturerSku, barcode: row.barcode, brand: row.brand, category: row.category, categoryPath: row.categoryPath }, query) + (primaryIds.has(`supplier:${row.id}`) ? 2_000 : 0) + (intent ? productHasCapability(row, intent) ? 8_000 : -6_000 : 0),
      value: { id: `supplier:${row.id}`, name: row.name, href: `/supplier-products/${row.slug}`, image: row.images[0], brand: row.brand, category: row.category ?? "Catalogue", sku: row.supplierSku },
    })),
    ...manual.map(row => ({
      score: catalogueSuggestionScore({ name: row.name, sku: row.sku, brand: row.brand?.name, category: row.category.name }, query) + (primaryIds.has(`internal:${row.id}`) ? 2_000 : 0) + (intent ? productHasCapability({ name: row.name, category: row.category.name }, intent) ? 8_000 : -6_000 : 0),
      value: { id: `internal:${row.id}`, name: row.name, href: `/products/${row.slug}`, image: row.images[0].path, brand: row.brand?.name ?? null, category: row.category.name, sku: row.sku },
    })),
  ].filter(item => item.score > 0).sort((left, right) => right.score - left.score || left.value.name.localeCompare(right.value.name));
  const unique = new Map<string, CatalogueSuggestion>();
  for (const item of ranked) {
    const identity = key(`${item.value.brand ?? ""}:${item.value.name}`) || item.value.id;
    if (!unique.has(identity)) unique.set(identity, item.value);
    if (unique.size >= Math.min(Math.max(limit, 1), 10)) break;
  }
  return [...unique.values()];
}
