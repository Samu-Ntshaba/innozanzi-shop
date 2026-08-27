import { ImageResponse } from "next/og";

import { getProductBySlug } from "@/domain/catalogue/queries";
import { absoluteUrl, globalSeoSettings } from "@/domain/marketing/seo";
import { activeUnitPrice } from "@/domain/cart/calculations";
import { formatZar } from "@/lib/money";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), globalSeoSettings()]);
  if (!product) return new Response("Product not found", { status: 404 });

  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  const productImage = primaryImage ? absoluteUrl(primaryImage.path, settings.siteUrl) : null;
  const logo = absoluteUrl("/brand/innozanzi-shop-logo-white.png", settings.siteUrl);
  const description =
    product.shortDescription ??
    `Buy ${product.name} online with secure payment and nationwide delivery from Innozanzi.`;
  const price = activeUnitPrice(product);

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f8fafc", color: "#071b33", fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: "52%", display: "flex", alignItems: "center", justifyContent: "center", padding: "56px" }}>
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #dbe3ea", borderRadius: "24px", background: "white" }}>
          {productImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={productImage} style={{ width: "82%", height: "82%", objectFit: "contain" }} />
          ) : (
            <div style={{ color: "#64748b", fontSize: "28px" }}>Product image coming soon</div>
          )}
        </div>
      </div>
      <div style={{ width: "48%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#071b33", color: "white", padding: "58px 54px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Innozanzi Shop" src={logo} style={{ width: "220px", height: "110px", objectFit: "contain", objectPosition: "left center" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#59b7e8", fontSize: "22px", fontWeight: 700, marginBottom: "18px" }}>{product.brand?.name ?? product.category.name}</div>
          <div style={{ fontSize: product.name.length > 70 ? "38px" : "46px", lineHeight: 1.08, fontWeight: 700 }}>{product.name}</div>
          <div style={{ color: "#cbd5e1", fontSize: "21px", lineHeight: 1.45, marginTop: "22px" }}>{description.length > 150 ? `${description.slice(0, 147)}…` : description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "20px", fontWeight: 700 }}><span>{formatZar(price)}</span><span>Shop online <span style={{ color: "#59b7e8", marginLeft: "8px" }}>→</span></span></div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
