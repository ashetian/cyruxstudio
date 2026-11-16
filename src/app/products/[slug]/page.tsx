import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";
import { ProductDetail } from "@/components/storefront/product-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  let { slug } = await params;
  if (slug === "eyes-never-lie-tee") slug = "cyrux-099-orbital-tee";
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: "Product Not Found" };
  const image = resolveEditorialAssets([product]).productImages[product.slug] || "/og-image.jpg";
  const description = product.description.slice(0, 160);

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | CYRUX STUDIO`,
      description,
      url: `/products/${product.slug}`,
      type: "website",
      images: [
        {
          url: image,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | CYRUX STUDIO`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "eyes-never-lie-tee") {
    redirect("/products/cyrux-099-orbital-tee");
  }
  const [product, others, settings] = await Promise.all([
    prisma.product.findUnique({ where: { slug } }),
    prisma.product.findMany({
      where: { slug: { not: slug } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.storeSettings.findFirst(),
  ]);
  if (!product) notFound();

  const editorial = resolveEditorialAssets(
    [product, ...others],
    settings?.brandMetadata as Record<string, unknown> | null
  );

  return (
    <ProductDetail
      product={product}
      others={others}
      productImages={editorial.productImages}
      heroImage={editorial.hero}
      currency={settings?.currency || "USD"}
      whatsappNumber={settings?.whatsappNumber || "+905551234567"}
    />
  );
}
