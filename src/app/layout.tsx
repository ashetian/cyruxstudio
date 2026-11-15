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
      path: "../../public/fonts/sekuya-latin.woff2",
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

export const metadata: Metadata = {
  title: "cyrux studio | Wearable Art & Brutalist Streetwear",
  description:
    "Avant-garde cyberpunk streetwear, high-contrast monochrome silhouettes and brutalist physical garments.",
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
