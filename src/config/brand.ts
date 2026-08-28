export const brand = {
  name: "Innozanzi",
  legalName: "Innozanzi (Pty) Ltd",
  shopName: "Innozanzi Shop",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za",
  promise: "Specialist technology, practical guidance and nationwide delivery from people who live computers.",
  description: "South Africa’s specialist shop for laptops, computers, PC components, gaming gear, servers and useful technology.",
  positioning: "We do not sell everything. We specialise in technology and help people choose, build and buy it with confidence.",
  founder: { name: "Singelo Njabulo", title: "Founder, CEO and Director" },
  contact: { email: "support@innozanzi.co.za", phone: "+27 71 238 4185" },
  experiences: { gaming: "Innozanzi Gaming", pcBuilder: "Innozanzi PC Workshop" },
  assets: { headerLogo: "/brand/innozanzi-shop-logo-header-v2.png", lightLogo: "/brand/innozanzi-shop-logo-white.png", schemaLogo: "/brand/innozanzi-shop-logo.png", socialImage: "/social/innozanzi-share.png" },
} as const;
