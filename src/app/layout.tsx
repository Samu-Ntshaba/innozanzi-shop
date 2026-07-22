import type { Metadata } from "next";
import "./globals.css";
import { SystemFeedback } from "@/components/system-feedback";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za"),
  title: "Innozanzi Shop",
  description: "ICT products, procurement and technology solutions for South Africa.",
  icons: { icon: "/icon.png", apple: "/icon.png" },
  openGraph: {
    title: "Innozanzi Shop",
    description: "ICT products, procurement and technology solutions for South Africa.",
    type: "website",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">{children}<SystemFeedback /></body>
    </html>
  );
}
