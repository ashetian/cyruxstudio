import prisma, { getFallbackDropsSync, syncFallbackDrops } from "@/lib/db";
import { INITIAL_DROPS as SEED_DROPS } from "@/lib/seed-data";

export interface DropData {
  id: string;
  slug: string;
  number: string;
  chapter: string;
  title: string;
  status: "active" | "archived" | "upcoming";
  releaseDate: {
    tr: string;
    en: string;
  };
  edition: {
    tr: string;
    en: string;
  };
  description: {
    tr: string;
    en: string;
  };
  productSlugs: string[];
  bannerImage: string;
  totalPieces: number;
  createdAt?: string;
  updatedAt?: string;
}

export const INITIAL_DROPS: DropData[] = SEED_DROPS as DropData[];

function mapPrismaDrop(d: {
  id: string;
  slug: string;
  number: string;
  chapter: string;
  title: string;
  status: string;
  releaseDate: unknown;
  edition: unknown;
  description: unknown;
  productSlugs: string[];
  bannerImage: string;
  totalPieces: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): DropData {
  return {
    id: d.id,
    slug: d.slug,
    number: d.number,
    chapter: d.chapter,
    title: d.title,
    status: (d.status as "active" | "archived" | "upcoming") || "upcoming",
    releaseDate:
      typeof d.releaseDate === "object" && d.releaseDate !== null
        ? (d.releaseDate as { tr: string; en: string })
        : { tr: "YAKINDA", en: "COMING SOON" },
    edition:
      typeof d.edition === "object" && d.edition !== null
        ? (d.edition as { tr: string; en: string })
        : { tr: "LİMİTLİ", en: "LIMITED" },
    description:
      typeof d.description === "object" && d.description !== null
        ? (d.description as { tr: string; en: string })
        : { tr: "", en: "" },
    productSlugs: Array.isArray(d.productSlugs) ? d.productSlugs : [],
    bannerImage: d.bannerImage || "/assets/editorial/hero-desktop.jpg",
    totalPieces: Number(d.totalPieces) || 100,
    createdAt: d.createdAt
      ? new Date(d.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: d.updatedAt
      ? new Date(d.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

export function getDropsSync(): DropData[] {
  return getFallbackDropsSync().map(mapPrismaDrop);
}

export async function getDrops(): Promise<DropData[]> {
  try {
    const records = await prisma.drop.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (records) {
      syncFallbackDrops(records, false);
      return records.map(mapPrismaDrop);
    }
    return getDropsSync();
  } catch (err) {
    console.warn(
      "[Drops DB Query Warning]: Failed to fetch drops from DB, serving unified store:",
      err
    );
    return getDropsSync();
  }
}

export function getActiveDrop(): DropData {
  const list = getDropsSync();
  return list.find((d) => d.status === "active") || list[0] || INITIAL_DROPS[0];
}

export async function getActiveDropAsync(): Promise<DropData> {
  try {
    const record = await prisma.drop.findFirst({
      where: { status: "active" },
    });
    if (record) {
      return mapPrismaDrop(record);
    }
  } catch (err) {
    console.warn("[Drops DB getActiveDrop Warning]:", err);
  }
  return getActiveDrop();
}

export function getDropBySlug(slug: string): DropData | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  if (normalized === "latest" || normalized === "current" || normalized === "active") {
    return getActiveDrop();
  }
  return getDropsSync().find(
    (d) =>
      d.slug.toLowerCase() === normalized ||
      d.id.toLowerCase() === normalized ||
      d.number.toLowerCase() === normalized
  );
}

export async function getDropBySlugAsync(slug: string): Promise<DropData | undefined> {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  if (normalized === "latest" || normalized === "current" || normalized === "active") {
    return getActiveDropAsync();
  }
  try {
    const record = await prisma.drop.findFirst({
      where: {
        OR: [{ slug: normalized }, { id: slug }, { number: slug }],
      },
    });
    if (record) {
      return mapPrismaDrop(record);
    }
  } catch (err) {
    console.warn("[Drops DB getDropBySlug Warning]:", err);
  }
  return getDropBySlug(slug);
}

export async function saveDrop(
  data: Partial<DropData> & { title: string; number: string; chapter: string }
): Promise<DropData> {
  let dropId = data.id?.trim();
  if (!dropId) {
    dropId = `drop-${Date.now().toString().slice(-6)}`;
  }

  const generatedSlug = (
    data.slug?.trim() || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  ).replace(/^-|-$/g, "");

  const dropPayload = {
    id: dropId,
    slug: generatedSlug,
    number: data.number.trim(),
    chapter: data.chapter.trim(),
    title: data.title.trim().toUpperCase(),
    status: (data.status as "active" | "archived" | "upcoming") || "upcoming",
    releaseDate: {
      tr: data.releaseDate?.tr?.trim() || "YAKINDA",
      en: data.releaseDate?.en?.trim() || "COMING SOON",
    },
    edition: {
      tr: data.edition?.tr?.trim() || "SINIRLI STÜDYO DROPU",
      en: data.edition?.en?.trim() || "LIMITED ATELIER RUN",
    },
    description: {
      tr: data.description?.tr?.trim() || "",
      en: data.description?.en?.trim() || "",
    },
    productSlugs: Array.isArray(data.productSlugs) ? data.productSlugs : [],
    bannerImage: data.bannerImage?.trim() || "/assets/editorial/hero-desktop.jpg",
    totalPieces: Number(data.totalPieces) || 100,
  };

  // If this drop is becoming active, archive existing active drops in DB
  if (dropPayload.status === "active") {
    try {
      await prisma.drop.updateMany({
        where: { status: "active" },
        data: { status: "archived" },
      });
    } catch {}
  }

  let saved: DropData;
  try {
    const savedRecord = await prisma.drop.upsert({
      where: { id: dropId },
      create: dropPayload,
      update: dropPayload,
    });
    saved = mapPrismaDrop(savedRecord);

    // Ensure unified fallback store reflects authoritative DB rows
    const currentList = getFallbackDropsSync();
    const updatedList = currentList.map((d) =>
      dropPayload.status === "active" && d.status === "active" && d.id !== saved.id
        ? { ...d, status: "archived" }
        : d
    );
    const idx = updatedList.findIndex(
      (d) => d.id === saved.id || d.slug === saved.slug
    );
    if (idx !== -1) {
      updatedList[idx] = {
        ...updatedList[idx],
        ...dropPayload,
        updatedAt: new Date(saved.updatedAt || Date.now()),
      };
    } else {
      updatedList.push({
        ...dropPayload,
        createdAt: new Date(saved.createdAt || Date.now()),
        updatedAt: new Date(saved.updatedAt || Date.now()),
      });
    }
    syncFallbackDrops(updatedList, false);
  } catch {
    saved = {
      id: dropId,
      slug: dropPayload.slug,
      number: dropPayload.number,
      chapter: dropPayload.chapter,
      title: dropPayload.title,
      status: dropPayload.status as "active" | "archived" | "upcoming",
      releaseDate: dropPayload.releaseDate as { tr: string; en: string },
      edition: dropPayload.edition as { tr: string; en: string },
      description: dropPayload.description as { tr: string; en: string },
      productSlugs: dropPayload.productSlugs,
      bannerImage: dropPayload.bannerImage,
      totalPieces: dropPayload.totalPieces,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const currentList = getFallbackDropsSync().map((d) =>
      dropPayload.status === "active" && d.status === "active"
        ? { ...d, status: "archived" }
        : d
    );
    const idx = currentList.findIndex(
      (d) => d.id === saved.id || d.slug === saved.slug
    );
    const record = {
      ...dropPayload,
      createdAt: new Date(saved.createdAt || Date.now()),
      updatedAt: new Date(saved.updatedAt || Date.now()),
    };
    if (idx !== -1) currentList[idx] = record;
    else currentList.unshift(record);
    syncFallbackDrops(currentList, true);
  }

  // Synchronize active drop into StoreSettings brandMetadata
  if (saved.status === "active") {
    try {
      const settings = await prisma.storeSettings.findFirst();
      if (settings) {
        const meta = (settings.brandMetadata as Record<string, unknown>) || {};
        await prisma.storeSettings.update({
          where: { id: settings.id },
          data: {
            brandMetadata: {
              ...meta,
              activeDropSlug: saved.slug,
              activeDropNumber: saved.number,
              activeDropTitle: saved.title,
            },
          },
        });
      }
    } catch {}
  }

  return saved;
}

export async function setActiveDrop(id: string): Promise<DropData | null> {
  try {
    const target = await prisma.drop.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (target) {
      await prisma.drop.updateMany({
        where: { status: "active" },
        data: { status: "archived" },
      });

      const updated = await prisma.drop.update({
        where: { id: target.id },
        data: { status: "active" },
      });

      const mapped = mapPrismaDrop(updated);

      const syncedList = getFallbackDropsSync().map((d) => ({
        ...d,
        status: d.id === mapped.id || d.slug === mapped.slug ? "active" : "archived",
      }));
      syncFallbackDrops(syncedList, false);

      try {
        const settings = await prisma.storeSettings.findFirst();
        if (settings) {
          const meta = (settings.brandMetadata as Record<string, unknown>) || {};
          await prisma.storeSettings.update({
            where: { id: settings.id },
            data: {
              brandMetadata: {
                ...meta,
                activeDropSlug: mapped.slug,
                activeDropNumber: mapped.number,
                activeDropTitle: mapped.title,
              },
            },
          });
        }
      } catch {}

      return mapped;
    }
  } catch {
    // Fallback to unified store if DB pooler fails
  }

  const fallbackList = getFallbackDropsSync();
  const targetIdx = fallbackList.findIndex((d) => d.id === id || d.slug === id);
  if (targetIdx === -1) return null;
  const nextList = fallbackList.map((d, idx) => ({
    ...d,
    status: idx === targetIdx ? "active" : "archived",
    updatedAt: new Date(),
  }));
  syncFallbackDrops(nextList, true);
  return mapPrismaDrop(nextList[targetIdx]);
}

export async function deleteDrop(id: string): Promise<boolean> {
  try {
    const target = await prisma.drop.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!target) {
      return false;
    }

    const wasActive = target.status === "active";
    await prisma.drop.delete({
      where: { id: target.id },
    });

    const remaining = getFallbackDropsSync().filter(
      (d) => d.id !== target.id && d.slug !== target.slug
    );
    syncFallbackDrops(remaining, false);

    if (wasActive && remaining.length > 0) {
      await setActiveDrop(remaining[0].id);
    }
    return true;
  } catch {
    const current = getFallbackDropsSync();
    const target = current.find((d) => d.id === id || d.slug === id);
    if (!target) return false;
    const wasActive = target.status === "active";
    const remaining = current.filter((d) => d.id !== target.id && d.slug !== target.slug);
    syncFallbackDrops(remaining, true);
    if (wasActive && remaining.length > 0) {
      await setActiveDrop(remaining[0].id);
    }
    return true;
  }
}

export const CURRENT_ACTIVE_DROP: DropData = new Proxy({} as DropData, {
  get(_target, prop) {
    const active = getActiveDrop();
    return Reflect.get(active, prop);
  },
});

export const DROPS_CATALOG: DropData[] = new Proxy([] as unknown as DropData[], {
  get(_target, prop) {
    const currentList = getDropsSync();
    if (prop === "length") return currentList.length;
    if (typeof prop === "string" && !isNaN(Number(prop))) {
      return currentList[Number(prop)];
    }
    const val = Reflect.get(currentList, prop);
    return typeof val === "function" ? val.bind(currentList) : val;
  },
});
