import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { prisma } from "@/lib/prisma";
import { isDailySpecial, supplierRetailPrice } from "./retail-pricing";
import { catalogueSearchScore, catalogueSearchTerms, fairCataloguePage, interleaveCatalogueGroups } from "./search";
import { homepageShelf } from "./homepage-shelves";
import type { Prisma } from "@/generated/prisma/client";
import { supplierCapabilityWhere } from "./taxonomy";
import { homepageShowcaseWindow, premiumShowcase } from "./homepage-rotation";
export type ProductMarketingFlag = "PROMOTION" | "UNBOXED" | "LAST_CHANCE" | "SPECIAL";
export function supplierMarketingFlags(categoryPath: string | null | undefined, promotionActive: boolean, special: boolean): ProductMarketingFlag[] {
    const path = categoryPath?.toLowerCase() ?? "", flags: ProductMarketingFlag[] = [];
    if (promotionActive || path.startsWith("on promo/"))
        flags.push("PROMOTION");
    if (path.includes("|unboxed"))
        flags.push("UNBOXED");
    if (path.includes("|last chance"))
        flags.push("LAST_CHANCE");
    if (special && !promotionActive)
        flags.push("SPECIAL");
    return flags;
}
const productCardSelect = {
    id: true,
    name: true,
    slug: true,
    sku: true,
    regularPrice: true,
    salePrice: true,
    saleStartsAt: true,
    saleEndsAt: true,
    stockStatus: true,
    isTestData: true,
    brand: { select: { name: true, slug: true } },
    category: { select: { name: true, slug: true } },
    images: { where: { isPrimary: true }, take: 1, select: { path: true, altText: true } },
} as const;

const sellableManualWhere:Prisma.ProductWhereInput = {
    status: "PUBLISHED" as const,
    deletedAt: null,
    isTestData: false,
    stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] },
    images: { some: { isPrimary: true } },
};

export async function getAdminTestProducts() {
    return prisma.product.findMany({
        where: { status: "PUBLISHED", deletedAt: null, isTestData: true },
        orderBy: { publishedAt: "desc" },
        take: 4,
        select: productCardSelect,
    });
}
const supplierCardSelect = { id: true, supplierId: true, name: true, slug: true, supplierSku: true, manufacturerSku: true, barcode: true, availability: true, stock: true, brand: true, category: true, categoryPath: true, description: true, images: true, costPrice: true, recommendedRetail: true, promotionalPrice: true, promotionStartsAt: true, promotionEndsAt: true, sourceUpdatedAt: true } as const;
type SupplierCardRow = {
    id: string;
    supplierId: string;
    name: string;
    slug: string;
    supplierSku: string;
    manufacturerSku: string | null;
    barcode: string | null;
    availability: string;
    stock: number;
    brand: string | null;
    category: string | null;
    categoryPath: string | null;
    description: string | null;
    images: string[];
    costPrice: {
        toString(): string;
    } | null;
    recommendedRetail: {
        toString(): string;
    } | null;
    promotionalPrice: {
        toString(): string;
    } | null;
    promotionStartsAt: Date | null;
    promotionEndsAt: Date | null;
    sourceUpdatedAt: Date | null;
};
const supplierCard = async (p: SupplierCardRow): Promise<ProductCardData> => { const special = isDailySpecial(p.id), price = p.costPrice ? await supplierRetailPrice({ costPrice: p.costPrice.toString(), recommendedRetail: p.recommendedRetail?.toString(), promotionalPrice: p.promotionalPrice?.toString(), promotionStartsAt: p.promotionStartsAt, promotionEndsAt: p.promotionEndsAt, special }) : null, marketingFlags = supplierMarketingFlags(p.categoryPath, Boolean(price?.promotionActive), special); return { id: p.id, name: p.name, slug: p.slug, sku: p.supplierSku, stockStatus: p.availability === "IN_STOCK" ? "IN_STOCK" : "OUT_OF_STOCK", brand: p.brand ? { name: p.brand, slug: p.brand.toLowerCase() } : null, category: { name: p.category ?? "Catalogue", slug: p.category ?? "catalogue" }, images: p.images.slice(0, 1).map(path => ({ path, altText: p.name })), regularPrice: price?.regularPrice.toString() ?? null, salePrice: price?.salePrice?.toString() ?? null, saleStartsAt: null, saleEndsAt: null, source: "supplier", marketingFlags }; };
const HOMEPAGE_SHOWCASE_KEY = "homepage.showcase.v1";
const homepageShowcaseCandidates = async (): Promise<SupplierCardRow[]> => prisma.supplierCatalogueProduct.findMany({ where: {
        ...await sellableSupplierWhere(),
        active: true, availability: "IN_STOCK", images: { isEmpty: false }, stock: { gt: 0 }, costPrice: { gt: 12000 }, AND: [{ NOT: { categoryPath: { contains: "|Unboxed", mode: "insensitive" } } }, { NOT: { categoryPath: { contains: "|Last Chance", mode: "insensitive" } } }], OR: [{ category: "Computers" }, { categoryPath: { contains: "Gaming", mode: "insensitive" } }, { categoryPath: { contains: "Monitors", mode: "insensitive" } }, { name: { contains: "workstation", mode: "insensitive" } }]
    }, orderBy: { costPrice: "desc" }, take: 160, select: supplierCardSelect });
type StoredShowcase = { rotationKey: string; productIds: string[]; selectedAt: string };
const storedShowcase = (value: unknown): StoredShowcase | null => { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const row = value as Partial<StoredShowcase>; return typeof row.rotationKey === "string" && Array.isArray(row.productIds) && row.productIds.every(id => typeof id === "string") && typeof row.selectedAt === "string" ? row as StoredShowcase : null; };
async function saveHomepageShowcase(products: SupplierCardRow[], now: Date) {
    const value: StoredShowcase = { rotationKey: homepageShowcaseWindow(now).key, productIds: products.map(product => product.id), selectedAt: now.toISOString() };
    try {
        await prisma.siteSetting.upsert({ where: { key: HOMEPAGE_SHOWCASE_KEY }, create: { key: HOMEPAGE_SHOWCASE_KEY, value, description: "Automatically selected weekly homepage showcase products." }, update: { value } });
        return true;
    }
    catch (error) {
        console.error("Unable to persist homepage showcase selection", error);
        return false;
    }
}
async function resolveHomepageShowcase(candidates: SupplierCardRow[], settingValue: unknown, now: Date) {
    const setting = storedShowcase(settingValue), window = homepageShowcaseWindow(now), byId = new Map(candidates.map(product => [product.id, product]));
    if (setting?.rotationKey === window.key && setting.productIds.length === 3) {
        const current = setting.productIds.map(id => byId.get(id)).filter((product): product is SupplierCardRow => Boolean(product));
        if (current.length === 3)
            return current;
    }
    const selected = premiumShowcase(candidates, now);
    if (selected.length === 3)
        await saveHomepageShowcase(selected, now);
    return selected;
}
export async function refreshHomepageShowcase(now = new Date()) {
    const [candidates, row] = await Promise.all([homepageShowcaseCandidates(), prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_SHOWCASE_KEY }, select: { value: true } })]);
    const setting = storedShowcase(row?.value), window = homepageShowcaseWindow(now), byId = new Map(candidates.map(product => [product.id, product]));
    const current = setting?.rotationKey === window.key && setting.productIds.length === 3 ? setting.productIds.map(id => byId.get(id)).filter((product): product is SupplierCardRow => Boolean(product)) : [];
    if (current.length === 3)
        return { rotationKey: window.key, selected: current.map(product => ({ id: product.id, name: product.name, stock: product.stock })), persisted: true, changed: false };
    const selected = premiumShowcase(candidates, now), persisted = selected.length === 3 ? await saveHomepageShowcase(selected, now) : false;
    return { rotationKey: window.key, selected: selected.map(product => ({ id: product.id, name: product.name, stock: product.stock })), persisted, changed: persisted };
}
export async function getHomepageShelfProducts(key: string) {
    const shelf = homepageShelf(key);
    if (!shelf)
        return [];
    try {
        const paths = "paths" in shelf ? shelf.paths : [], categories = "categories" in shelf ? shelf.categories : [];
        const rows = await prisma.supplierCatalogueProduct.findMany({ where: {
                ...{ active: true, availability: "IN_STOCK", stock: { gt: 0 }, costPrice: { gt: 0 }, images: { isEmpty: false }, OR: [...paths.map(path => ({ categoryPath: { startsWith: path, mode: "insensitive" as const } })), ...categories.map(category => ({ category: { equals: category, mode: "insensitive" as const } }))] },
                ...await sellableSupplierWhere()
            }, orderBy: [{ promotionalPrice: "asc" }, { sourceUpdatedAt: "desc" }], take: 8, select: supplierCardSelect });
        return (await Promise.all(rows.map(supplierCard))).slice(0, 4);
    }
    catch (error) {
        console.error(`Homepage shelf ${key} unavailable`, error);
        return [];
    }
}
export async function getHomepageCatalogue() {
    try {
        const merchandiseWhere = { active: true, availability: "IN_STOCK" as const, images: { isEmpty: false } };
        const now = new Date();
        const [supplierCategories, featured, specials, popular, brands, supplierNewest, total, inStock, laptopsAndComputers, monitors, accessories, networking, powerAndBackup, promotions, unboxed, lastChance, showcaseCandidates, showcaseSetting] = await Promise.all([
            prisma.supplierCatalogueProduct.groupBy({ by: ["category"], where: {
                    ...{ active: true, category: { not: null } },
                    ...await sellableSupplierWhere()
                }, _count: true, orderBy: { _count: { category: "desc" } }, take: 8 }),
            prisma.product.findMany({ where: { ...sellableManualWhere, isFeatured: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
            prisma.product.findMany({ where: { ...sellableManualWhere, isSpecial: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
            prisma.product.findMany({ where: { ...sellableManualWhere, isPopular: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
            prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 12, select: { id: true, name: true, slug: true, logoPath: true } }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, costPrice: { gt: 0 } },
                    ...await sellableSupplierWhere()
                }, orderBy: { costPrice: "asc" }, take: 8, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.count({ where: {
                    ...{ active: true },
                    ...await sellableSupplierWhere()
                } }), prisma.supplierCatalogueProduct.count({ where: {
                    ...{ active: true, availability: "IN_STOCK" },
                    ...await sellableSupplierWhere()
                } }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, costPrice: { gt: 0 }, ...supplierCapabilityWhere("COMPUTER") },
                    ...await sellableSupplierWhere()
                }, orderBy: { costPrice: "asc" }, take: 12, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, costPrice: { gt: 0 }, ...supplierCapabilityWhere("MONITOR") },
                    ...await sellableSupplierWhere()
                }, orderBy: { costPrice: "asc" }, take: 12, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, costPrice: { gt: 0 }, OR: [supplierCapabilityWhere("KEYBOARD"), supplierCapabilityWhere("MOUSE"), supplierCapabilityWhere("HEADSET"), { categoryPath: { contains: "Hubs & docking", mode: "insensitive" } }, { categoryPath: { contains: "Stands and cooling", mode: "insensitive" } }] },
                    ...await sellableSupplierWhere()
                }, orderBy: { costPrice: "asc" }, take: 12, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, costPrice: { gt: 0 }, category: "Networking & security" },
                    ...await sellableSupplierWhere()
                }, orderBy: { costPrice: "asc" }, take: 12, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, costPrice: { gt: 0 }, OR: [{ categoryPath: { startsWith: "Power/UPS & inverters" } }, { categoryPath: { startsWith: "Power/Portable power stations" } }, { categoryPath: { startsWith: "Power/Power banks" } }] },
                    ...await sellableSupplierWhere()
                }, orderBy: { costPrice: "asc" }, take: 12, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, stock: { gt: 0 }, costPrice: { gt: 0 }, OR: [{ categoryPath: { startsWith: "On Promo/", mode: "insensitive" } }, { promotionalPrice: { not: null }, AND: [{ OR: [{ promotionStartsAt: null }, { promotionStartsAt: { lte: now } }] }, { OR: [{ promotionEndsAt: null }, { promotionEndsAt: { gte: now } }] }] }] },
                    ...await sellableSupplierWhere()
                }, orderBy: [{ promotionEndsAt: "asc" }, { sourceUpdatedAt: "desc" }], take: 4, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, stock: { gt: 0 }, costPrice: { gt: 0 }, categoryPath: { contains: "|Unboxed", mode: "insensitive" } },
                    ...await sellableSupplierWhere()
                }, orderBy: { sourceUpdatedAt: "desc" }, take: 4, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ ...merchandiseWhere, stock: { gt: 0 }, costPrice: { gt: 0 }, categoryPath: { contains: "|Last Chance", mode: "insensitive" } },
                    ...await sellableSupplierWhere()
                }, orderBy: { stock: "asc" }, take: 4, select: supplierCardSelect }),
            homepageShowcaseCandidates(),
            prisma.siteSetting.findUnique({ where: { key: HOMEPAGE_SHOWCASE_KEY }, select: { value: true } }),
        ]);
        const categories = supplierCategories.map((x, index) => ({ id: `supplier-${index}`, name: x.category!, slug: x.category!, description: `${x._count.toLocaleString("en-ZA")} catalogue products`, imagePath: null }));
        const supplierCards = await Promise.all(supplierNewest.map(supplierCard));
        const promotionCards = await Promise.all(promotions.map(async (product) => ({ ...await supplierCard(product), offerType: "PROMOTION" as const })));
        const unboxedCards = await Promise.all(unboxed.map(async (product) => ({ ...await supplierCard(product), offerType: "UNBOXED" as const })));
        const lastChanceCards = await Promise.all(lastChance.map(async (product) => ({ ...await supplierCard(product), offerType: "LAST_CHANCE" as const })));
        const computerCards = await Promise.all(laptopsAndComputers.map(supplierCard)), monitorCards = await Promise.all(monitors.map(supplierCard)), accessoryCards = await Promise.all(accessories.map(supplierCard)), networkCards = await Promise.all(networking.map(supplierCard)), powerCards = await Promise.all(powerAndBackup.map(supplierCard));
        const curated = { laptopsAndComputers: computerCards.slice(0, 4), monitors: monitorCards.slice(0, 4), accessories: accessoryCards.slice(0, 4), networking: networkCards.slice(0, 4), powerAndBackup: powerCards.slice(0, 4) };
        const priorityOffers = [promotionCards[0], unboxedCards[0], lastChanceCards[0]].filter(product => product !== undefined);
        const supplierOffers = [...priorityOffers, ...promotionCards, ...unboxedCards, ...lastChanceCards, ...supplierCards.map(product => ({ ...product, offerType: "SPECIAL" as const }))].filter((product, index, array) => array.findIndex(row => row.id === product.id) === index);
        const showcaseCards = await Promise.all((await resolveHomepageShowcase(showcaseCandidates, showcaseSetting?.value, now)).map(supplierCard));
        const heroProducts = showcaseCards.length === 3 ? showcaseCards : supplierOffers.slice(0, 3);
        return { categories, featured: featured.length ? featured : supplierCards.slice(0, 4), newest: supplierCards, specials, popular, brands, total, inStock, ...curated, heroProducts, promotions: promotionCards, unboxed: unboxedCards, lastChance: lastChanceCards };
    }
    catch (error) {
        console.error("Catalogue unavailable", error);
        return { categories: [], featured: [], newest: [], specials: [], popular: [], brands: [], total: 0, inStock: 0, laptopsAndComputers: [], monitors: [], accessories: [], networking: [], powerAndBackup: [], heroProducts: [], promotions: [], unboxed: [], lastChance: [] };
    }
}
export async function getCatalogue(input: {
    search?: string;
    category?: string;
    brand?: string;
    availability?: string;
    promotion?: string;
    collection?: string;
    sort?: string;
    page?: number;
}) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = 12;
    const search = input.search?.trim();
    const searchTerms = catalogueSearchTerms(search);
    let category = input.category?.trim();
    try {
        if (category)
            category = decodeURIComponent(category);
    }
    catch { /* Keep the original category. */ }
    const businessComputers = category === "business-computers";
    const catalogueNow = new Date();
    const promotionsOnly = input.promotion === "active" || input.collection === "promotions";
    const where = {
        ...sellableManualWhere,
        ...(search ? { OR: searchTerms.flatMap(term => [{ name: { contains: term, mode: "insensitive" as const } }, { sku: { contains: term, mode: "insensitive" as const } }, { shortDescription: { contains: term, mode: "insensitive" as const } }, { description: { contains: term, mode: "insensitive" as const } }, { brand: { name: { contains: term, mode: "insensitive" as const } } }, { category: { name: { contains: term, mode: "insensitive" as const } } }]) } : {}),
        ...(category && !businessComputers ? { category: { slug: category } } : {}),
        ...(input.brand ? { brand: { slug: input.brand } } : {}),
    };
    const orderBy = input.sort === "name" ? { name: "asc" as const } : { publishedAt: "desc" as const };
    try {
        const supplierWhere = { active: true, AND: [...(search ? [{ OR: searchTerms.flatMap(term => [{ name: { contains: term, mode: "insensitive" as const } }, { supplierSku: { contains: term, mode: "insensitive" as const } }, { manufacturerSku: { contains: term, mode: "insensitive" as const } }, { barcode: { contains: term, mode: "insensitive" as const } }, { brand: { contains: term, mode: "insensitive" as const } }, { category: { contains: term, mode: "insensitive" as const } }, { categoryPath: { contains: term, mode: "insensitive" as const } }, { description: { contains: term, mode: "insensitive" as const } }, { shortDescription: { contains: term, mode: "insensitive" as const } }]) }] : []), ...(businessComputers ? [{ category: "Computers", OR: [{ categoryPath: { contains: "Creator", mode: "insensitive" as const } }, { categoryPath: { contains: "Notebooks", mode: "insensitive" as const } }, { name: { contains: "workstation", mode: "insensitive" as const } }] }] : input.category ? [{ category: { equals: input.category, mode: "insensitive" as const } }] : []), ...(input.collection === "unboxed" ? [{ categoryPath: { contains: "|Unboxed", mode: "insensitive" as const } }] : []), ...(input.collection === "last-chance" ? [{ categoryPath: { contains: "|Last Chance", mode: "insensitive" as const } }] : []), ...(promotionsOnly ? [{ OR: [{ categoryPath: { startsWith: "On Promo/", mode: "insensitive" as const } }, { promotionalPrice: { not: null }, AND: [{ OR: [{ promotionStartsAt: null }, { promotionStartsAt: { lte: catalogueNow } }] }, { OR: [{ promotionEndsAt: null }, { promotionEndsAt: { gte: catalogueNow } }] }] }] }] : [])], ...(input.brand ? { brand: { equals: input.brand, mode: "insensitive" as const } } : {}), ...(input.availability === "in-stock" ? { availability: "IN_STOCK" } : {}) };
        const supplierOnly = Boolean(input.promotion || input.collection);
        const [supplierTotal, manualTotal, supplierCategories, supplierBrands, manualCategories, manualBrands] = await Promise.all([
            prisma.supplierCatalogueProduct.count({ where: {
                    ...supplierWhere,
                    ...await sellableSupplierWhere()
                } }), supplierOnly ? Promise.resolve(0) : prisma.product.count({ where }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ active: true, category: { not: null } },
                    ...await sellableSupplierWhere()
                }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ active: true, brand: { not: null } },
                    ...await sellableSupplierWhere()
                }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
            prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } }), prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } })
        ]);
        const skip = (page - 1) * pageSize;
        const priceSort = input.sort === "price-asc" || input.sort === "price-desc";
        if (priceSort) {
            const [supplierRows, manualRows] = await Promise.all([
                prisma.supplierCatalogueProduct.findMany({ where: { ...supplierWhere, ...await sellableSupplierWhere() }, select: supplierCardSelect }),
                supplierOnly ? Promise.resolve([]) : prisma.product.findMany({ where, select: productCardSelect }),
            ]);
            const allProducts = [...await Promise.all(supplierRows.map(supplierCard)), ...manualRows];
            const effectivePrice = (product: ProductCardData) => Number(product.salePrice?.toString() ?? product.regularPrice?.toString() ?? Number.POSITIVE_INFINITY);
            allProducts.sort((a, b) => priceSort && input.sort === "price-desc" ? effectivePrice(b) - effectivePrice(a) : effectivePrice(a) - effectivePrice(b));
            const total = allProducts.length;
            const categories = [...supplierCategories.map(x => ({ name: x.category!, slug: x.category! })), ...manualCategories];
            const brands = [...supplierBrands.map(x => ({ name: x.brand!, slug: x.brand! })), ...manualBrands];
            return { products: allProducts.slice(skip, skip + pageSize), total, page, pages: Math.max(1, Math.ceil(total / pageSize)), categories, brands, matchMode: search && searchTerms.length > 1 ? "expanded" as const : "exact" as const };
        }
        const supplierEligibility = { ...supplierWhere, ...await sellableSupplierWhere() };
        const rank = (a: SupplierCardRow, b: SupplierCardRow) => {
            if (input.sort === "name") return a.name.localeCompare(b.name);
            if (input.sort === "stock") return b.stock - a.stock || a.name.localeCompare(b.name);
            if (input.sort === "oldest") return (a.sourceUpdatedAt?.getTime() ?? 0) - (b.sourceUpdatedAt?.getTime() ?? 0) || a.name.localeCompare(b.name);
            if (search) {
                const score = (row: SupplierCardRow) => catalogueSearchScore({ name: row.name, sku: row.supplierSku, manufacturerSku: row.manufacturerSku, barcode: row.barcode, brand: row.brand, category: row.category, categoryPath: row.categoryPath, description: row.description }, search);
                return score(b) - score(a) || Number(Boolean(b.promotionalPrice)) - Number(Boolean(a.promotionalPrice)) || b.stock - a.stock || a.name.localeCompare(b.name);
            }
            return Number(Boolean(b.promotionalPrice)) - Number(Boolean(a.promotionalPrice)) || b.stock - a.stock || a.name.localeCompare(b.name);
        };
        let supplierProducts: SupplierCardRow[];
        if (search) {
            const rankedSupplierRows = await prisma.supplierCatalogueProduct.findMany({ where: supplierEligibility, orderBy: [{ name: "asc" }, { id: "asc" }], select: supplierCardSelect });
            rankedSupplierRows.sort(rank);
            supplierProducts = interleaveCatalogueGroups(rankedSupplierRows, row => row.supplierId).slice(skip, skip + pageSize);
        } else {
            const groups = await prisma.supplierCatalogueProduct.groupBy({ by: ["supplierId"], where: supplierEligibility, _count: { _all: true }, orderBy: { supplierId: "asc" } });
            const plan = fairCataloguePage(groups.map(group => ({ key: group.supplierId, count: group._count._all })), skip, pageSize);
            const orderBy = input.sort === "name" ? [{ name: "asc" as const }, { id: "asc" as const }] : input.sort === "stock" ? [{ stock: "desc" as const }, { name: "asc" as const }] : input.sort === "oldest" ? [{ sourceUpdatedAt: "asc" as const }, { name: "asc" as const }] : [{ stock: "desc" as const }, { name: "asc" as const }];
            const batches = await Promise.all(plan.windows.map(window => prisma.supplierCatalogueProduct.findMany({ where: { ...supplierEligibility, supplierId: window.key }, orderBy, skip: window.skip, take: window.take, select: supplierCardSelect })));
            const queues = new Map(plan.windows.map((window, index) => [window.key, batches[index]]));
            supplierProducts = plan.order.flatMap(key => queues.get(key)?.shift() ?? []);
        }
        const supplierTake = supplierProducts.length;
        const manualSkip = Math.max(0, skip - supplierTotal);
        const manualProducts = !supplierOnly && supplierTake < pageSize
            ? await prisma.product.findMany({ where, orderBy, skip: manualSkip, take: pageSize - supplierTake, select: productCardSelect })
            : [];
        const products = [...await Promise.all(supplierProducts.map(supplierCard)), ...manualProducts];
        const total = supplierTotal + manualTotal;
        const categories = [...supplierCategories.map(x => ({ name: x.category!, slug: x.category! })), ...manualCategories];
        const brands = [...supplierBrands.map(x => ({ name: x.brand!, slug: x.brand! })), ...manualBrands];
        return { products, total, page, pages: Math.max(1, Math.ceil(total / pageSize)), categories, brands, matchMode: search && searchTerms.length > 1 ? "expanded" as const : "exact" as const };
    }
    catch (error) {
        console.error("Catalogue search unavailable", error);
        return { products: [], total: 0, page: 1, pages: 1, categories: [], brands: [], matchMode: "exact" as const };
    }
}
const gamingGroups = [
    { slug: "gaming-pcs", name: "Gaming PCs", terms: ["Gaming desktops"] },
    { slug: "laptops", name: "Gaming Laptops", terms: ["Gaming notebooks"] },
    { slug: "monitors", name: "Gaming Monitors", terms: ["Gaming monitors"] },
    { slug: "graphics", name: "Graphics Cards", terms: ["Components/Graphics cards/"] },
    { slug: "keyboards", name: "Gaming Keyboards", terms: ["Gaming keyboards"] },
    { slug: "mice", name: "Gaming Mice", terms: ["Gaming mice"] },
    { slug: "audio", name: "Headsets & Audio", terms: ["Gaming headsets", "gaming speakers"] },
    { slug: "controllers", name: "Controllers", terms: ["Computer peripherals/Game controllers", "Gaming simulation gear"] },
    { slug: "streaming", name: "Streaming", terms: ["Computer peripherals/Microphones", "capture card"] },
    { slug: "components", name: "Performance Components", terms: ["Gaming chassis", "Components/Upgrade kits", "Components/Cooling/Liquid coolers", "gaming memory"] },
] as const;
const gamingOr = (terms: string[]) => terms.flatMap(term => [{ name: { contains: term, mode: "insensitive" as const } }, { categoryPath: { contains: term, mode: "insensitive" as const } }]);
const gamingSearchOr = (term: string) => [{ name: { contains: term, mode: "insensitive" as const } }, { supplierSku: { contains: term, mode: "insensitive" as const } }, { brand: { contains: term, mode: "insensitive" as const } }, { categoryPath: { contains: term, mode: "insensitive" as const } }];
export async function getGamingCatalogue(input: {
    search?: string;
    group?: string;
    brand?: string;
    page?: number;
}) {
    const page = Math.max(1, input.page ?? 1), pageSize = 16, group = gamingGroups.find(item => item.slug === input.group), baseTerms = gamingGroups.flatMap(item => item.terms), search = input.search?.trim();
    try {
        const where = { active: true, availability: "IN_STOCK", stock: { gt: 0 }, costPrice: { gt: 0 }, images: { isEmpty: false }, AND: [{ OR: gamingOr(group ? [...group.terms] : baseTerms) }, ...(search ? [{ OR: gamingSearchOr(search) }] : []), ...(input.brand ? [{ brand: { equals: input.brand, mode: "insensitive" as const } }] : []),], ...await sellableSupplierWhere() };
        const [total, rows, brands, groupCounts] = await Promise.all([
            prisma.supplierCatalogueProduct.count({ where }),
            prisma.supplierCatalogueProduct.findMany({ where, orderBy: [{ promotionalPrice: "asc" }, { sourceUpdatedAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: supplierCardSelect }),
            prisma.supplierCatalogueProduct.findMany({ where: {
                    ...{ active: true, availability: "IN_STOCK", OR: gamingOr(baseTerms), brand: { not: null } },
                    ...await sellableSupplierWhere()
                }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
            Promise.all(await Promise.all(gamingGroups.map(async (item) => ({ ...item, count: await prisma.supplierCatalogueProduct.count({ where: {
                        ...{ active: true, availability: "IN_STOCK", stock: { gt: 0 }, OR: gamingOr([...item.terms]) },
                        ...await sellableSupplierWhere()
                    } }) })))),
        ]);
        return { products: await Promise.all(rows.map(supplierCard)), total, page, pages: Math.max(1, Math.ceil(total / pageSize)), brands: brands.map(item => item.brand!).filter(Boolean), groups: groupCounts.filter(item => item.count > 0) };
    }
    catch (error) {
        console.error("Gaming catalogue unavailable", error);
        return { products: [], total: 0, page: 1, pages: 1, brands: [], groups: [] };
    }
}
export async function getProductBySlug(slug: string, includeTestData = false) {
    return prisma.product.findFirst({
        where: includeTestData ? { slug, status: "PUBLISHED", deletedAt: null } : { slug, ...sellableManualWhere },
        include: {
            brand: true,
            category: true,
            images: { orderBy: { sortOrder: "asc" } },
            variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { values: { include: { value: { include: { attribute: true } } } }, inventory: true } },
            specifications: { orderBy: { sortOrder: "asc" } },
            documents: { where: { isPublic: true } },
            inventory: { where: { variantId: null }, take: 1 },
            reviews: { where: { status: { in: ["APPROVED", "PENDING"] } }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
        },
    });
}
export type ProductCardData = {
    id: string;
    name: string;
    slug: string;
    sku: string;
    stockStatus: string;
    isTestData?: boolean;
    regularPrice?: {
        toString(): string;
    } | string | null;
    salePrice?: {
        toString(): string;
    } | string | null;
    saleStartsAt?: Date | null;
    saleEndsAt?: Date | null;
    brand: {
        name: string;
        slug: string;
    } | null;
    category: {
        name: string;
        slug: string;
    };
    images: {
        path: string;
        altText: string | null;
    }[];
    source?: "supplier";
    offerType?: "PROMOTION" | "UNBOXED" | "LAST_CHANCE" | "SPECIAL";
    marketingFlags?: ProductMarketingFlag[];
};
