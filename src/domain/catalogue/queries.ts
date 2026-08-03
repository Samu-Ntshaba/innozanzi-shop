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
    const [supplierCategories, featured, newest, specials, popular, brands,supplierNewest,total,inStock] = await Promise.all([
      prisma.supplierCatalogueProduct.groupBy({by:["category"],where:{active:true,category:{not:null}},_count:true,orderBy:{_count:{category:"desc"}},take:8}),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isFeatured: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isNew: true }, take: 8, orderBy: { publishedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isSpecial: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isPopular: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 12, select: { id: true, name: true, slug: true, logoPath: true } }),
      prisma.supplierCatalogueProduct.findMany({where:{active:true,images:{isEmpty:false}},orderBy:{sourceUpdatedAt:"desc"},take:8,select:{id:true,name:true,slug:true,supplierSku:true,availability:true,brand:true,category:true,images:true}}),
      prisma.supplierCatalogueProduct.count({where:{active:true}}),prisma.supplierCatalogueProduct.count({where:{active:true,availability:"IN_STOCK"}}),
    ]);
    const categories=supplierCategories.map((x,index)=>({id:`supplier-${index}`,name:x.category!,slug:x.category!,description:`${x._count.toLocaleString("en-ZA")} catalogue products`,imagePath:null}));
    const supplierCards=supplierNewest.map(p=>({id:p.id,name:p.name,slug:p.slug,sku:p.supplierSku,stockStatus:p.availability==="IN_STOCK"?"IN_STOCK":"OUT_OF_STOCK",brand:p.brand?{name:p.brand,slug:p.brand}:null,category:{name:p.category??"Catalogue",slug:p.category??"catalogue"},images:p.images.slice(0,1).map(path=>({path,altText:p.name})),source:"supplier" as const}));
    return { categories, featured:featured.length?featured:supplierCards.slice(0,4), newest:supplierCards, specials, popular, brands,total,inStock };
  } catch (error) {
    console.error("Catalogue unavailable", error);
    return { categories: [], featured: [], newest: [], specials: [], popular: [], brands: [],total:0,inStock:0 };
  }
}

export async function getCatalogue(input: { search?: string; category?: string; brand?: string; availability?:string; promotion?:string; sort?: string; page?: number }) {
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
    const supplierWhere={active:true,...(input.search?{OR:[{name:{contains:input.search,mode:"insensitive" as const}},{supplierSku:{contains:input.search,mode:"insensitive" as const}},{manufacturerSku:{contains:input.search,mode:"insensitive" as const}},{brand:{contains:input.search,mode:"insensitive" as const}},{category:{contains:input.search,mode:"insensitive" as const}}]}:{}),...(input.category?{category:{equals:input.category,mode:"insensitive" as const}}:{}),...(input.brand?{brand:{equals:input.brand,mode:"insensitive" as const}}:{}),...(input.availability==="in-stock"?{availability:"IN_STOCK"}:{}),...(input.promotion==="active"?{promotionalPrice:{not:null}}:{})};
    const [supplierTotal,manualTotal,supplierCategories,supplierBrands,manualCategories,manualBrands]=await Promise.all([
      prisma.supplierCatalogueProduct.count({where:supplierWhere}),prisma.product.count({where}),
      prisma.supplierCatalogueProduct.findMany({where:{active:true,category:{not:null}},distinct:["category"],select:{category:true},orderBy:{category:"asc"}}),
      prisma.supplierCatalogueProduct.findMany({where:{active:true,brand:{not:null}},distinct:["brand"],select:{brand:true},orderBy:{brand:"asc"}}),
      prisma.category.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{name:true,slug:true}}),prisma.brand.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{name:true,slug:true}})
    ]);
    const skip=(page-1)*pageSize;const supplierTake=Math.max(0,Math.min(pageSize,supplierTotal-skip));const manualSkip=Math.max(0,skip-supplierTotal);const [supplierProducts,manualProducts]=await Promise.all([
      supplierTake?prisma.supplierCatalogueProduct.findMany({where:supplierWhere,orderBy:input.sort==="name"?{name:"asc"}:input.sort==="stock"?{stock:"desc"}:input.sort==="oldest"?{sourceUpdatedAt:"asc"}:{sourceUpdatedAt:"desc"},skip,take:supplierTake,select:{id:true,name:true,slug:true,supplierSku:true,availability:true,brand:true,category:true,images:true}}):[],
      supplierTake<pageSize?prisma.product.findMany({where,orderBy,skip:manualSkip,take:pageSize-supplierTake,select:productCardSelect}):[]
    ]);
    const products=[...supplierProducts.map(p=>({id:p.id,name:p.name,slug:p.slug,sku:p.supplierSku,stockStatus:p.availability==="IN_STOCK"?"IN_STOCK":"OUT_OF_STOCK",brand:p.brand?{name:p.brand,slug:p.brand.toLowerCase()}:null,category:{name:p.category??"Catalogue",slug:p.category??"catalogue"},images:p.images.slice(0,1).map(path=>({path,altText:p.name})),source:"supplier" as const})),...manualProducts];
    const total=supplierTotal+manualTotal;const categories=[...supplierCategories.map(x=>({name:x.category!,slug:x.category!})),...manualCategories];const brands=[...supplierBrands.map(x=>({name:x.brand!,slug:x.brand!})),...manualBrands];
    return {products,total,page,pages:Math.max(1,Math.ceil(total/pageSize)),categories,brands};
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

export type ProductCardData = {
  id:string;name:string;slug:string;sku:string;stockStatus:string;
  brand:{name:string;slug:string}|null;category:{name:string;slug:string};
  images:{path:string;altText:string|null}[];source?:"supplier";
};
