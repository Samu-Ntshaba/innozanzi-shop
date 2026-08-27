export const brand = {
  name: "Innozanzi",
  legalName: "Innozanzi (Pty) Ltd",
  shopName: "Innozanzi Shop",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za",
  promise: "Technology chosen with care, delivered across South Africa and supported by real people.",
  description: "Laptops, computers, components and useful technology for work, study, home and play.",
  contact: { email: "support@innozanzi.co.za", phone: "+27 71 238 4185" },
  experiences: { gaming: "Innozanzi Gaming", pcBuilder: "Innozanzi PC Workshop" },
  assets: { headerLogo: "/brand/innozanzi-shop-logo-header-v2.png", lightLogo: "/brand/innozanzi-shop-logo-white.png", schemaLogo: "/brand/innozanzi-shop-logo.png", socialImage: "/social/innozanzi-share.png" },
} as const;
