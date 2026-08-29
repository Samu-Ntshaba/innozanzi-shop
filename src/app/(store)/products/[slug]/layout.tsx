import { activeUnitPrice } from "@/domain/cart/calculations";
import { getProductBySlug } from "@/domain/catalogue/queries";
import { absoluteUrl, globalSeoSettings, merchantShippingDetails, safeJsonLd } from "@/domain/marketing/seo";

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug); if (!product) return children;
  const seo = await globalSeoSettings(); const url = `${seo.siteUrl}/products/${product.slug}`;
  const available = product.variants.length ? product.variants.some(variant => (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0) > 0) : (product.inventory[0]?.onHand ?? 0) - (product.inventory[0]?.reserved ?? 0) > 0;
  const price = activeUnitPrice(product).toFixed(2);
  const approvedReviews = product.reviews;
  const rating = approvedReviews.length ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length : null;
  const data = [
    { "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`, name: product.name, url, sku: product.sku, gtin: product.barcode ?? undefined, description: product.shortDescription ?? product.description ?? undefined, image: product.images.map(image => absoluteUrl(image.path, seo.siteUrl)), brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined, category: product.category.name, itemCondition: "https://schema.org/NewCondition", aggregateRating: rating ? { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: approvedReviews.length } : undefined, offers: { "@type": "Offer", url, priceCurrency: product.currency, price, availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition", shippingDetails:merchantShippingDetails(price),seller: { "@type": "Organization", name: seo.businessName, "@id": `${seo.siteUrl}/#organization` } } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", seo.siteUrl], ["Products", `${seo.siteUrl}/shop`], [product.category.name, `${seo.siteUrl}/categories/${product.category.slug}`], [product.name, url]].map(([name, item], index) => ({ "@type": "ListItem", position: index + 1, name, item })) },
  ];
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}/>{children}</>;
}
