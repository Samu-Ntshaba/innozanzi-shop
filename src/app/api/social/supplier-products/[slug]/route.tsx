/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { isDailySpecial, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { absoluteUrl, globalSeoSettings } from "@/domain/marketing/seo";
import { formatZar } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const product = await prisma.supplierCatalogueProduct.findFirst({ where: { slug: (await params).slug, active: true } });
  if (!product) return new Response("Product not found", { status: 404 });
  const settings = await globalSeoSettings();
  const image = product.images[0] ? absoluteUrl(product.images[0], settings.siteUrl) : null;
  const logo = absoluteUrl("/brand/innozanzi-shop-logo-white.png", settings.siteUrl);
  const retail = product.costPrice ? supplierRetailPrice({ costPrice: product.costPrice, recommendedRetail: product.recommendedRetail, promotionalPrice: product.promotionalPrice, promotionStartsAt: product.promotionStartsAt, promotionEndsAt: product.promotionEndsAt, special: isDailySpecial(product.id) }) : null;
  const price = retail?.salePrice ?? retail?.regularPrice;
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",background:"#f8fafc",color:"#071b33",fontFamily:"Arial, sans-serif"}}>
    <div style={{width:"52%",display:"flex",alignItems:"center",justifyContent:"center",padding:"56px"}}><div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #dbe3ea",borderRadius:"24px",background:"white"}}>{image?<img alt="" src={image} style={{width:"82%",height:"82%",objectFit:"contain"}}/>:<div style={{color:"#64748b",fontSize:"28px"}}>Product image coming soon</div>}</div></div>
    <div style={{width:"48%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#071b33",color:"white",padding:"58px 54px"}}><img alt="Innozanzi Shop" src={logo} style={{width:"220px",height:"110px",objectFit:"contain",objectPosition:"left center"}}/><div style={{display:"flex",flexDirection:"column"}}><div style={{color:"#59b7e8",fontSize:"22px",fontWeight:700,marginBottom:"18px"}}>{product.brand??product.category??"Technology"}</div><div style={{fontSize:product.name.length>70?"38px":"46px",lineHeight:1.08,fontWeight:700}}>{product.name}</div><div style={{color:"#cbd5e1",fontSize:"21px",lineHeight:1.45,marginTop:"22px"}}>Secure online payment and nationwide delivery.</div></div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:"20px",fontWeight:700}}><span>{price?formatZar(price):"Shop online"}</span><span>View product <span style={{color:"#59b7e8",marginLeft:"8px"}}>→</span></span></div></div>
  </div>, { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
