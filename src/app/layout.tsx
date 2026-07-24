import type { Metadata } from "next";
import "./globals.css";
import { SystemFeedback } from "@/components/system-feedback";
import { TestModeBanner } from "@/components/test-mode-banner";
import { isTestModeEnvironment } from "@/lib/test-mode";
import { globalSeoSettings,organisationJsonLd,safeJsonLd } from "@/domain/marketing/seo";

export async function generateMetadata():Promise<Metadata>{const s=await globalSeoSettings();return{metadataBase:new URL(s.siteUrl),title:{default:s.siteTitle,template:s.titleTemplate},description:s.description,applicationName:s.businessName,icons:{icon:"/icon.png",apple:"/icon.png"},verification:{google:s.googleVerification||undefined,other:s.bingVerification?{"msvalidate.01":[s.bingVerification]}:undefined},openGraph:{title:s.siteTitle,description:s.description,type:"website",siteName:s.businessName,url:s.siteUrl,locale:"en_ZA",images:s.defaultImage?[{url:s.defaultImage,width:1200,height:630,alt:"Innozanzi — technology that moves business forward",type:"image/png"}]:undefined},twitter:{card:"summary_large_image",site:s.twitter||undefined,title:s.siteTitle,description:s.description,images:s.defaultImage?[{url:s.defaultImage,alt:"Innozanzi — technology that moves business forward"}]:undefined},robots:isTestModeEnvironment()?{index:false,follow:false,noarchive:true}:{index:true,follow:true}}}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full"><OrganizationSchema/><TestModeBanner/>{children}<SystemFeedback /></body>
    </html>
  );
}
async function OrganizationSchema(){return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(await organisationJsonLd())}}/>}
