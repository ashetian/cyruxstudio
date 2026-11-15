import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono } from "next/font/google";
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
    icon: "/favicon.ico",
    apple: "/assets/brand/apple-touch-icon.png",
  },
};

import { SearchProvider } from "@/components/providers/search-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`dark ${fontMono.variable} ${fontSans.variable}`}>
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
