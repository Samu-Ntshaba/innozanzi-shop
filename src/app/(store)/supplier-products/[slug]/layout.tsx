import { isDailySpecial, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { absoluteUrl, globalSeoSettings, safeJsonLd } from "@/domain/marketing/seo";
import { prisma } from "@/lib/prisma";

export default async function SupplierProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const product = await prisma.supplierCatalogueProduct.findFirst({ where: { slug: (await params).slug, active: true } }); if (!product) return children;
  const seo = await globalSeoSettings(); const url = `${seo.siteUrl}/supplier-products/${product.slug}`;
  const retail = product.costPrice ? supplierRetailPrice({ costPrice: product.costPrice, recommendedRetail: product.recommendedRetail, promotionalPrice: product.promotionalPrice, promotionStartsAt: product.promotionStartsAt, promotionEndsAt: product.promotionEndsAt, special: isDailySpecial(product.id) }) : null;
  const price = retail?.salePrice ?? retail?.regularPrice;
  const description = (product.shortDescription ?? product.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || undefined;
  const data = [
    { "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`, name: product.name, url, sku: product.supplierSku, mpn: product.manufacturerSku ?? undefined, gtin: product.barcode ?? undefined, description, image: product.images.map(image => absoluteUrl(image, seo.siteUrl)), brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined, category: product.category ?? undefined, itemCondition: "https://schema.org/NewCondition", offers: price ? { "@type": "Offer", url, priceCurrency: product.currency, price: price.toFixed(2), availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: seo.businessName, "@id": `${seo.siteUrl}/#organization` } } : undefined },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", seo.siteUrl], ["Products", `${seo.siteUrl}/shop`], [product.category ?? "Catalogue", `${seo.siteUrl}/categories/${encodeURIComponent(product.category ?? "catalogue")}`], [product.name, url]].map(([name, item], index) => ({ "@type": "ListItem", position: index + 1, name, item })) },
  ];
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}/>{children}</>;
}
