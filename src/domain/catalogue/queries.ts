import { prisma } from "@/lib/prisma";

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  stockStatus: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1, select: { path: true, altText: true } },
} as const;

export async function getHomepageCatalogue() {
  try {
    const [categories, featured, newest, specials, popular, brands] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, take: 8, select: { id: true, name: true, slug: true, description: true, imagePath: true } }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isFeatured: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isNew: true }, take: 8, orderBy: { publishedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isSpecial: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isPopular: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 12, select: { id: true, name: true, slug: true, logoPath: true } }),
    ]);
    return { categories, featured, newest, specials, popular, brands };
  } catch (error) {
    console.error("Catalogue unavailable", error);
    return { categories: [], featured: [], newest: [], specials: [], popular: [], brands: [] };
  }
}

export async function getCatalogue(input: { search?: string; category?: string; brand?: string; sort?: string; page?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = 12;
  const where = {
    status: "PUBLISHED" as const,
    deletedAt: null,
    isTestData:false,
    ...(input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" as const } }, { sku: { contains: input.search, mode: "insensitive" as const } }] } : {}),
    ...(input.category ? { category: { slug: input.category } } : {}),
    ...(input.brand ? { brand: { slug: input.brand } } : {}),
  };
  const orderBy = input.sort === "name" ? { name: "asc" as const } : { publishedAt: "desc" as const };

  try {
    const [products, total, categories, brands] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select: productCardSelect }),
      prisma.product.count({ where }),
      prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    ]);
    return { products, total, page, pages: Math.max(1, Math.ceil(total / pageSize)), categories, brands };
  } catch (error) {
    console.error("Catalogue search unavailable", error);
    return { products: [], total: 0, page: 1, pages: 1, categories: [], brands: [] };
  }
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null,isTestData:false },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { values: { include: { value: { include: { attribute: true } } } }, inventory: true } },
      specifications: { orderBy: { sortOrder: "asc" } },
      documents: { where: { isPublic: true } },
      inventory: { where: { variantId: null }, take: 1 },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } },
    },
  });
}

export type ProductCardData = Awaited<ReturnType<typeof getCatalogue>>["products"][number];
