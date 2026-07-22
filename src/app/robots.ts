import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_SITE_URL??"https://shop.innozanzi.co.za";return{rules:{userAgent:"*",allow:"/",disallow:["/admin/","/account/","/api/","/cart"]},sitemap:`${base}/sitemap.xml`,host:base}}
