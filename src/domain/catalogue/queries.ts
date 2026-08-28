import { prisma } from "@/lib/prisma";
import { isDailySpecial, supplierRetailPrice } from "./retail-pricing";
import { catalogueSearchTerms } from "./search";
import { homepageShelf } from "./homepage-shelves";

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
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { where: { isPrimary: true }, take: 1, select: { path: true, altText: true } },
} as const;

const supplierCardSelect = {id:true,name:true,slug:true,supplierSku:true,availability:true,brand:true,category:true,images:true,costPrice:true,recommendedRetail:true,promotionalPrice:true,promotionStartsAt:true,promotionEndsAt:true} as const;
type SupplierCardRow = {id:string;name:string;slug:string;supplierSku:string;availability:string;brand:string|null;category:string|null;images:string[];costPrice:{toString():string}|null;recommendedRetail:{toString():string}|null;promotionalPrice:{toString():string}|null;promotionStartsAt:Date|null;promotionEndsAt:Date|null};
const supplierCard = (p:SupplierCardRow):ProductCardData => {const price=p.costPrice?supplierRetailPrice({costPrice:p.costPrice.toString(),recommendedRetail:p.recommendedRetail?.toString(),promotionalPrice:p.promotionalPrice?.toString(),promotionStartsAt:p.promotionStartsAt,promotionEndsAt:p.promotionEndsAt,special:isDailySpecial(p.id)}):null;return{id:p.id,name:p.name,slug:p.slug,sku:p.supplierSku,stockStatus:p.availability==="IN_STOCK"?"IN_STOCK":"OUT_OF_STOCK",brand:p.brand?{name:p.brand,slug:p.brand.toLowerCase()}:null,category:{name:p.category??"Catalogue",slug:p.category??"catalogue"},images:p.images.slice(0,1).map(path=>({path,altText:p.name})),regularPrice:price?.regularPrice.toString()??null,salePrice:price?.salePrice?.toString()??null,saleStartsAt:null,saleEndsAt:null,source:"supplier"}};

export async function getHomepageShelfProducts(key:string) {
  const shelf=homepageShelf(key);if(!shelf)return [];
  try {const paths="paths" in shelf?shelf.paths:[],categories="categories" in shelf?shelf.categories:[];const rows=await prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},OR:[...paths.map(path=>({categoryPath:{startsWith:path,mode:"insensitive" as const}})),...categories.map(category=>({category:{equals:category,mode:"insensitive" as const}}))]},orderBy:[{promotionalPrice:"asc"},{sourceUpdatedAt:"desc"}],take:8,select:supplierCardSelect});return rows.map(supplierCard).slice(0,4)}catch(error){console.error(`Homepage shelf ${key} unavailable`,error);return []}
}

export async function getHomepageCatalogue() {
  try {
    const merchandiseWhere={active:true,availability:"IN_STOCK" as const,images:{isEmpty:false}};
    const now=new Date();
    const [supplierCategories, featured, specials, popular, brands,supplierNewest,total,inStock,laptopsAndComputers,monitors,accessories,networking,powerAndBackup,promotions,unboxed,lastChance] = await Promise.all([
      prisma.supplierCatalogueProduct.groupBy({by:["category"],where:{active:true,category:{not:null}},_count:true,orderBy:{_count:{category:"desc"}},take:8}),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isFeatured: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isSpecial: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null,isTestData:false, isPopular: true }, take: 8, orderBy: { updatedAt: "desc" }, select: productCardSelect }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 12, select: { id: true, name: true, slug: true, logoPath: true } }),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,costPrice:{gt:0}},orderBy:{costPrice:"asc"},take:8,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.count({where:{active:true}}),prisma.supplierCatalogueProduct.count({where:{active:true,availability:"IN_STOCK"}}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,costPrice:{gt:0},OR:[{categoryPath:{startsWith:"Computers/Notebooks/"}},{categoryPath:{startsWith:"Computers/Desktop computers/"}},{categoryPath:{startsWith:"Computers/AIO computers"}},{categoryPath:{startsWith:"Computers/Mini PCs/Complete systems"}}]},orderBy:{costPrice:"asc"},take:12,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,costPrice:{gt:0},categoryPath:{startsWith:"Computer peripherals/Monitors/"}},orderBy:{costPrice:"asc"},take:12,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,costPrice:{gt:0},OR:[{categoryPath:{startsWith:"Computer peripherals/Keyboards/"}},{categoryPath:{startsWith:"Computer peripherals/Mice/"}},{categoryPath:{startsWith:"Computer peripherals/Headsets/"}},{categoryPath:{startsWith:"Computer peripherals/Hubs & docking stations"}},{categoryPath:{startsWith:"Computer peripherals/Stands and cooling"}}]},orderBy:{costPrice:"asc"},take:12,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,costPrice:{gt:0},category:"Networking & security"},orderBy:{costPrice:"asc"},take:12,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,costPrice:{gt:0},OR:[{categoryPath:{startsWith:"Power/UPS & inverters"}},{categoryPath:{startsWith:"Power/Portable power stations"}},{categoryPath:{startsWith:"Power/Power banks"}}]},orderBy:{costPrice:"asc"},take:12,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,stock:{gt:0},costPrice:{gt:0},promotionalPrice:{not:null},AND:[{OR:[{promotionStartsAt:null},{promotionStartsAt:{lte:now}}]},{OR:[{promotionEndsAt:null},{promotionEndsAt:{gte:now}}]}]},orderBy:[{promotionEndsAt:"asc"},{sourceUpdatedAt:"desc"}],take:4,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,stock:{gt:0},costPrice:{gt:0},categoryPath:{contains:"|Unboxed",mode:"insensitive"}},orderBy:{sourceUpdatedAt:"desc"},take:4,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{...merchandiseWhere,stock:{gt:0},costPrice:{gt:0},categoryPath:{contains:"|Last Chance",mode:"insensitive"}},orderBy:{stock:"asc"},take:4,select:supplierCardSelect}),
    ]);
    const categories=supplierCategories.map((x,index)=>({id:`supplier-${index}`,name:x.category!,slug:x.category!,description:`${x._count.toLocaleString("en-ZA")} catalogue products`,imagePath:null}));
    const supplierCards=supplierNewest.map(supplierCard);
    const computerCards=laptopsAndComputers.map(supplierCard),monitorCards=monitors.map(supplierCard),accessoryCards=accessories.map(supplierCard),networkCards=networking.map(supplierCard),powerCards=powerAndBackup.map(supplierCard);
    const curated={laptopsAndComputers:computerCards.slice(0,4),monitors:monitorCards.slice(0,4),accessories:accessoryCards.slice(0,4),networking:networkCards.slice(0,4),powerAndBackup:powerCards.slice(0,4)};
    const rotation=Math.floor(Date.now()/86_400_000);
    const affordable=[...supplierCards,...computerCards,...monitorCards,...accessoryCards,...powerCards].filter((product,index,array)=>array.findIndex(row=>row.id===product.id)===index);const heroProducts=affordable.length?[affordable[rotation%affordable.length],affordable[(rotation+1)%affordable.length],affordable[(rotation+2)%affordable.length]].filter((x):x is ProductCardData=>Boolean(x)):[];
    return { categories, featured:featured.length?featured:supplierCards.slice(0,4), newest:supplierCards, specials, popular, brands,total,inStock,...curated,heroProducts,promotions:promotions.map(supplierCard),unboxed:unboxed.map(supplierCard),lastChance:lastChance.map(supplierCard) };
  } catch (error) {
    console.error("Catalogue unavailable", error);
    return { categories: [], featured: [], newest: [], specials: [], popular: [], brands: [],total:0,inStock:0,laptopsAndComputers:[],monitors:[],accessories:[],networking:[],powerAndBackup:[],heroProducts:[],promotions:[],unboxed:[],lastChance:[] };
  }
}

export async function getCatalogue(input: { search?: string; category?: string; brand?: string; availability?:string; promotion?:string; collection?:string; sort?: string; page?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = 12;
  const search=input.search?.trim();
  const searchTerms=catalogueSearchTerms(search);
  let category=input.category?.trim();try{if(category)category=decodeURIComponent(category)}catch{/* Keep the original category. */}
  const businessComputers=category==="business-computers";
  const catalogueNow=new Date();
  const promotionsOnly=input.promotion==="active"||input.collection==="promotions";
  const where = {
    status: "PUBLISHED" as const,
    deletedAt: null,
    isTestData:false,
    ...(search ? { OR: searchTerms.flatMap(term=>[{ name: { contains: term, mode: "insensitive" as const } }, { sku: { contains: term, mode: "insensitive" as const } },{shortDescription:{contains:term,mode:"insensitive" as const}},{description:{contains:term,mode:"insensitive" as const}},{brand:{name:{contains:term,mode:"insensitive" as const}}},{category:{name:{contains:term,mode:"insensitive" as const}}}]) } : {}),
    ...(category&&!businessComputers ? { category: { slug: category } } : {}),
    ...(input.brand ? { brand: { slug: input.brand } } : {}),
  };
  const orderBy = input.sort === "name" ? { name: "asc" as const } : { publishedAt: "desc" as const };

  try {
    const supplierWhere={active:true,AND:[...(search?[{OR:searchTerms.flatMap(term=>[{name:{contains:term,mode:"insensitive" as const}},{supplierSku:{contains:term,mode:"insensitive" as const}},{manufacturerSku:{contains:term,mode:"insensitive" as const}},{brand:{contains:term,mode:"insensitive" as const}},{category:{contains:term,mode:"insensitive" as const}},{categoryPath:{contains:term,mode:"insensitive" as const}},{description:{contains:term,mode:"insensitive" as const}},{shortDescription:{contains:term,mode:"insensitive" as const}}])}]:[]),...(businessComputers?[{category:"Computers",OR:[{categoryPath:{contains:"Creator",mode:"insensitive" as const}},{categoryPath:{contains:"Notebooks",mode:"insensitive" as const}},{name:{contains:"workstation",mode:"insensitive" as const}}]}]:input.category?[{category:{equals:input.category,mode:"insensitive" as const}}]:[]),...(input.collection==="unboxed"?[{categoryPath:{contains:"|Unboxed",mode:"insensitive" as const}}]:[]),...(input.collection==="last-chance"?[{categoryPath:{contains:"|Last Chance",mode:"insensitive" as const}}]:[]),...(promotionsOnly?[{promotionalPrice:{not:null}},{OR:[{promotionStartsAt:null},{promotionStartsAt:{lte:catalogueNow}}]},{OR:[{promotionEndsAt:null},{promotionEndsAt:{gte:catalogueNow}}]}]:[])],...(input.brand?{brand:{equals:input.brand,mode:"insensitive" as const}}:{}),...(input.availability==="in-stock"?{availability:"IN_STOCK"}:{})};
    const supplierOnly=Boolean(input.promotion||input.collection);
    const [supplierTotal,manualTotal,supplierCategories,supplierBrands,manualCategories,manualBrands]=await Promise.all([
      prisma.supplierCatalogueProduct.count({where:supplierWhere}),supplierOnly?Promise.resolve(0):prisma.product.count({where}),
      prisma.supplierCatalogueProduct.findMany({where:{active:true,category:{not:null}},distinct:["category"],select:{category:true},orderBy:{category:"asc"}}),
      prisma.supplierCatalogueProduct.findMany({where:{active:true,brand:{not:null}},distinct:["brand"],select:{brand:true},orderBy:{brand:"asc"}}),
      prisma.category.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{name:true,slug:true}}),prisma.brand.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{name:true,slug:true}})
    ]);
    const skip=(page-1)*pageSize;const supplierTake=Math.max(0,Math.min(pageSize,supplierTotal-skip));const manualSkip=Math.max(0,skip-supplierTotal);const [supplierProducts,manualProducts]=await Promise.all([
      supplierTake?prisma.supplierCatalogueProduct.findMany({where:supplierWhere,orderBy:input.sort==="name"?{name:"asc"}:input.sort==="stock"?{stock:"desc"}:input.sort==="oldest"?{sourceUpdatedAt:"asc"}:{sourceUpdatedAt:"desc"},skip,take:supplierTake,select:supplierCardSelect}):[],
      !supplierOnly&&supplierTake<pageSize?prisma.product.findMany({where,orderBy,skip:manualSkip,take:pageSize-supplierTake,select:productCardSelect}):[]
    ]);
    const products=[...supplierProducts.map(supplierCard),...manualProducts];
    const total=supplierTotal+manualTotal;const categories=[...supplierCategories.map(x=>({name:x.category!,slug:x.category!})),...manualCategories];const brands=[...supplierBrands.map(x=>({name:x.brand!,slug:x.brand!})),...manualBrands];
    return {products,total,page,pages:Math.max(1,Math.ceil(total/pageSize)),categories,brands,matchMode:search&&searchTerms.length>1?"expanded" as const:"exact" as const};
  } catch (error) {
    console.error("Catalogue search unavailable", error);
    return { products: [], total: 0, page: 1, pages: 1, categories: [], brands: [],matchMode:"exact" as const };
  }
}

const gamingGroups=[
  {slug:"gaming-pcs",name:"Gaming PCs",terms:["Gaming desktops"]},
  {slug:"laptops",name:"Gaming Laptops",terms:["Gaming notebooks"]},
  {slug:"monitors",name:"Gaming Monitors",terms:["Gaming monitors"]},
  {slug:"graphics",name:"Graphics Cards",terms:["Components/Graphics cards/"]},
  {slug:"keyboards",name:"Gaming Keyboards",terms:["Gaming keyboards"]},
  {slug:"mice",name:"Gaming Mice",terms:["Gaming mice"]},
  {slug:"audio",name:"Headsets & Audio",terms:["Gaming headsets","gaming speakers"]},
  {slug:"controllers",name:"Controllers",terms:["Computer peripherals/Game controllers","Gaming simulation gear"]},
  {slug:"streaming",name:"Streaming",terms:["Computer peripherals/Microphones","capture card"]},
  {slug:"components",name:"Performance Components",terms:["Gaming chassis","Components/Upgrade kits","Components/Cooling/Liquid coolers","gaming memory"]},
] as const;
const gamingOr=(terms:string[])=>terms.flatMap(term=>[{name:{contains:term,mode:"insensitive" as const}},{categoryPath:{contains:term,mode:"insensitive" as const}}]);
const gamingSearchOr=(term:string)=>[{name:{contains:term,mode:"insensitive" as const}},{supplierSku:{contains:term,mode:"insensitive" as const}},{brand:{contains:term,mode:"insensitive" as const}},{categoryPath:{contains:term,mode:"insensitive" as const}}];

export async function getGamingCatalogue(input:{search?:string;group?:string;brand?:string;page?:number}){
  const page=Math.max(1,input.page??1),pageSize=16,group=gamingGroups.find(item=>item.slug===input.group),baseTerms=gamingGroups.flatMap(item=>item.terms),search=input.search?.trim();
  const where={active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},AND:[{OR:gamingOr(group?[...group.terms]:baseTerms)},...(search?[{OR:gamingSearchOr(search)}]:[]),...(input.brand?[{brand:{equals:input.brand,mode:"insensitive" as const}}]:[])]};
  try{
    const[total,rows,brands,groupCounts]=await Promise.all([
      prisma.supplierCatalogueProduct.count({where}),
      prisma.supplierCatalogueProduct.findMany({where,orderBy:[{promotionalPrice:"asc"},{sourceUpdatedAt:"desc"}],skip:(page-1)*pageSize,take:pageSize,select:supplierCardSelect}),
      prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",OR:gamingOr(baseTerms),brand:{not:null}},distinct:["brand"],select:{brand:true},orderBy:{brand:"asc"}}),
      Promise.all(gamingGroups.map(async item=>({...item,count:await prisma.supplierCatalogueProduct.count({where:{active:true,availability:"IN_STOCK",stock:{gt:0},OR:gamingOr([...item.terms])}})}))),
    ]);
    return{products:rows.map(supplierCard),total,page,pages:Math.max(1,Math.ceil(total/pageSize)),brands:brands.map(item=>item.brand!).filter(Boolean),groups:groupCounts.filter(item=>item.count>0)};
  }catch(error){console.error("Gaming catalogue unavailable",error);return{products:[],total:0,page:1,pages:1,brands:[],groups:[]}}
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
  regularPrice?:{toString():string}|string|null;salePrice?:{toString():string}|string|null;saleStartsAt?:Date|null;saleEndsAt?:Date|null;
  brand:{name:string;slug:string}|null;category:{name:string;slug:string};
  images:{path:string;altText:string|null}[];source?:"supplier";
};
