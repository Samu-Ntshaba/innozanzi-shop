export function GET() {
  return Response.json({
    id: "/mobile-admin",
    name: "Innozanzi Mobile Admin",
    short_name: "Innozanzi Admin",
    description: "Daily Innozanzi ecommerce operations from your phone.",
    start_url: "/mobile-admin",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#071b33",
    orientation: "portrait-primary",
    icons: [{ src: "/brand/innozanzi-shop-mark.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }],
  }, { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
