import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { resolveEditorialAssets } from "@/lib/editorial";
import { ProductDetail } from "@/components/storefront/product-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: "Product not found | cyrux studio" };
  const image = resolveEditorialAssets([product]).productImages[product.slug];
  const description = product.description.slice(0, 160);
  return {
    title: `${product.name} | cyrux studio`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
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

  const editorial = resolveEditorialAssets([product, ...others]);

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
