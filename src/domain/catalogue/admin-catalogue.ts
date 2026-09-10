import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { prisma } from "@/lib/prisma";
import { interleaveCatalogueGroups } from "./search";

export type CatalogueLinkOption = {
  reference: string;
  source: "INTERNAL" | "SUPPLIER";
  sourceId: string;
  supplierId: string | null;
  supplierName: string | null;
  name: string;
  sku: string;
  brand: string | null;
  publicPath: string;
  image: string | null;
};

export async function getAdminCatalogueOptions(): Promise<CatalogueLinkOption[]> {
  const [manual, supplier] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isTestData: false, stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] }, images: { some: { isPrimary: true } } },
      select: { id: true, name: true, sku: true, slug: true, brand: { select: { name: true } }, images: { where: { isPrimary: true }, take: 1, select: { path: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.supplierCatalogueProduct.findMany({
      where: await sellableSupplierWhere(),
      select: { id: true, supplierId: true, name: true, supplierSku: true, slug: true, brand: true, images: true, supplier: { select: { companyName: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  ]);
  const supplierOptions = interleaveCatalogueGroups(supplier, row => row.supplierId).map(row => ({
    reference: `supplier:${row.id}`, source: "SUPPLIER" as const, sourceId: row.id, supplierId: row.supplierId,
    supplierName: row.supplier.companyName, name: row.name, sku: row.supplierSku, brand: row.brand,
    publicPath: `/supplier-products/${row.slug}`, image: row.images[0] ?? null,
  }));
  return [
    ...supplierOptions,
    ...manual.map(row => ({ reference: `internal:${row.id}`, source: "INTERNAL" as const, sourceId: row.id, supplierId: null, supplierName: null, name: row.name, sku: row.sku, brand: row.brand?.name ?? null, publicPath: `/products/${row.slug}`, image: row.images[0]?.path ?? null })),
  ];
}

export async function resolveCatalogueReferences(references: string[]) {
  const unique = [...new Set(references)].slice(0, 12);
  if (!unique.length) return [];
  const supplierIds = unique.filter(value => value.startsWith("supplier:")).map(value => value.slice(9));
  const internalIds = unique.filter(value => value.startsWith("internal:")).map(value => value.slice(9));
  const [supplier, manual] = await Promise.all([
    supplierIds.length ? prisma.supplierCatalogueProduct.findMany({ where: { ...await sellableSupplierWhere(), id: { in: supplierIds } }, select: { id: true, supplierId: true, name: true, supplierSku: true, slug: true, brand: true, images: true, supplier: { select: { companyName: true } } } }) : [],
    internalIds.length ? prisma.product.findMany({ where: { id: { in: internalIds }, status: "PUBLISHED", deletedAt: null, isTestData: false, stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] }, images: { some: { isPrimary: true } } }, select: { id: true, name: true, sku: true, slug: true, brand: { select: { name: true } }, images: { where: { isPrimary: true }, take: 1, select: { path: true } } } }) : [],
  ]);
  const options: CatalogueLinkOption[] = [
    ...supplier.map(row => ({ reference: `supplier:${row.id}`, source: "SUPPLIER" as const, sourceId: row.id, supplierId: row.supplierId, supplierName: row.supplier.companyName, name: row.name, sku: row.supplierSku, brand: row.brand, publicPath: `/supplier-products/${row.slug}`, image: row.images[0] ?? null })),
    ...manual.map(row => ({ reference: `internal:${row.id}`, source: "INTERNAL" as const, sourceId: row.id, supplierId: null, supplierName: null, name: row.name, sku: row.sku, brand: row.brand?.name ?? null, publicPath: `/products/${row.slug}`, image: row.images[0]?.path ?? null })),
  ];
  const byReference = new Map(options.map(option => [option.reference, option]));
  return unique.map(reference => byReference.get(reference)).filter((option): option is CatalogueLinkOption => Boolean(option));
}
