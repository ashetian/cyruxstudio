import { revalidatePath } from "next/cache";

const DEFAULT_STOREFRONT_PATHS = [
  "/",
  "/shop",
  "/about",
  "/faq",
  "/contact",
  "/legal",
  "/drops",
  "/drops/latest",
];

export function revalidateStorefrontPaths(
  paths: string[] = DEFAULT_STOREFRONT_PATHS
): void {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Safe no-op outside Next.js request lifecycle (e.g. unit/integration tests)
  }
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      // Safe no-op outside Next.js request lifecycle
    }
  }
}
