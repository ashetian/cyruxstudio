import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll";
import { CartProvider } from "@/components/storefront/cart-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { CustomCursor } from "@/components/ui/custom-cursor";

const fontMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

const fontSans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

const fontSekuya = localFont({
  src: [
    {
      path: "../../public/fonts/sekuya.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-sekuya",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cyruxstudio.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CYRUX STUDIO | Wearable Art & Brutalist Streetwear",
    template: "%s | CYRUX STUDIO",
  },
  description:
    "Avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments engineered at our Cyprus atelier.",
  applicationName: "CYRUX STUDIO",
  authors: [{ name: "CYRUX STUDIO", url: "https://instagram.com/ashetian_" }],
  creator: "ashetian_",
  publisher: "CYRUX STUDIO",
  category: "Fashion & Apparel",
  keywords: [
    "cyrux studio",
    "cyrux",
    "wearable art",
    "brutalist streetwear",
    "cyberpunk fashion",
    "avant-garde streetwear",
    "cyprus atelier",
    "monochrome fashion",
    "heavyweight cotton tee",
    "limited drops",
    "luxury streetwear",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    alternateLocale: ["en_US"],
    url: siteUrl,
    siteName: "CYRUX STUDIO",
    title: "CYRUX STUDIO | Wearable Art & Brutalist Streetwear",
    description:
      "Avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments engineered at our Cyprus atelier.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CYRUX STUDIO - Wearable Art & Brutalist Streetwear",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CYRUX STUDIO | Wearable Art & Brutalist Streetwear",
    description:
      "Avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments.",
    creator: "@ashetian_",
    site: "@cyruxstudio",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

import { SearchProvider } from "@/components/providers/search-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark ${fontMono.variable} ${fontSans.variable} ${fontSekuya.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-brand-black antialiased selection:bg-black selection:text-white">
        <LanguageProvider>
          <CustomCursor />
          <CartProvider>
            <SearchProvider>
              <SmoothScrollProvider>
                {children}
              </SmoothScrollProvider>
            </SearchProvider>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
