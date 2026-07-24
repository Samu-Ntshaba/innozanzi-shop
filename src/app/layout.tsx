import type { Metadata } from "next";

import "./globals.css";
import { SystemFeedback } from "@/components/system-feedback";
import { TestModeBanner } from "@/components/test-mode-banner";
import {
  absoluteUrl,
  globalSeoSettings,
  organisationJsonLd,
  safeJsonLd,
} from "@/domain/marketing/seo";
import { isTestModeEnvironment } from "@/lib/test-mode";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await globalSeoSettings();
  const image = absoluteUrl(settings.defaultImage, settings.siteUrl);
  return {
    metadataBase: new URL(settings.siteUrl),
    title: { default: settings.siteTitle, template: settings.titleTemplate },
    description: settings.description,
    applicationName: settings.businessName,
    authors: [{ name: settings.businessName, url: settings.siteUrl }],
    creator: settings.businessName,
    publisher: settings.businessName,
    category: "Business technology",
    formatDetection: { email: false, address: false, telephone: false },
    icons: { icon: "/icon.png", apple: "/icon.png" },
    verification: {
      google: settings.googleVerification || undefined,
      other: settings.bingVerification ? { "msvalidate.01": [settings.bingVerification] } : undefined,
    },
    openGraph: {
      title: settings.siteTitle,
      description: settings.description,
      type: "website",
      siteName: settings.businessName,
      url: settings.siteUrl,
      locale: "en_ZA",
      countryName: "South Africa",
      images: image
        ? [{
            url: image,
            width: 1200,
            height: 630,
            alt: "Innozanzi — technology procurement, delivery and support",
            type: "image/png",
          }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: settings.twitter || undefined,
      creator: settings.twitter || undefined,
      title: settings.siteTitle,
      description: settings.description,
      images: image
        ? [{
            url: image,
            width: 1200,
            height: 630,
            alt: "Innozanzi — technology procurement, delivery and support",
          }]
        : undefined,
    },
    robots: isTestModeEnvironment()
      ? { index: false, follow: false, noarchive: true }
      : { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">
        <OrganizationSchema />
        <TestModeBanner />
        {children}
        <SystemFeedback />
      </body>
    </html>
  );
}

async function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(await organisationJsonLd()) }}
    />
  );
}
