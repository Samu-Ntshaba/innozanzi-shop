import type { MetadataRoute } from "next";
import { globalSeoSettings } from "@/domain/marketing/seo";
import { isTestModeEnvironment } from "@/lib/test-mode";
export default async function robots():Promise<MetadataRoute.Robots>{const{siteUrl:base}=await globalSeoSettings();if(isTestModeEnvironment()||process.env.NODE_ENV!=="production")return{rules:{userAgent:"*",disallow:"/"}};return{rules:{userAgent:"*",allow:"/",disallow:["/admin/","/account/","/api/","/cart","/sign-in","/register","/forgot-password","/reset-password","/verify-email","/unsubscribe","/*?search=","/*?sort=","/*?brand=","/*?category=","/*?utm_"]},sitemap:`${base}/sitemap.xml`,host:base}}
