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

function getNodeModules() {
  if (typeof window === "undefined") {
    try {
      const fs = eval("require")("fs");
      const path = eval("require")("path");
      const dataFile = path.join(process.cwd(), "data", "drops.json");
      return { fs, path, dataFile };
    } catch {
      return null;
    }
  }
  return null;
}

export const INITIAL_DROPS: DropData[] = [
  {
    id: "drop-01",
    slug: "first-ascent",
    number: "01",
    chapter: "CHAPTER 00",
    title: "FIRST ASCENT",
    status: "active",
    releaseDate: {
      tr: "KASIM 2026",
      en: "NOVEMBER 2026",
    },
    edition: {
      tr: "168 PARÇA • NUMARALI ARŞİV DROPU",
      en: "168 NUMBERED PIECES • ARCHIVAL RUN",
    },
    description: {
      tr: "Chapter 00 İlk Drop; hazır modanın tekdüze kalıplarını reddeden 5 giyilebilir sanat parçasından oluşur. 280-300 GSM ağır taranmış pamuk, el işçiliği asit yıkama ve avangart serigrafi baskılarla Kıbrıs atölyemizde üretilmiştir. Asla tekrar basılmayacaktır.",
      en: "Chapter 00 First Ascent consists of 5 wearable art sculptures rejecting fast fashion templates. Crafted from 280-300 GSM combed cotton with vintage acid washes and raw serigraphy at our Cyprus atelier. Strictly numbered. Never restocked.",
    },
    productSlugs: [
      "pretty-chaos-tee",
      "first-ascent-tee-white",
      "first-ascent-tee-black",
      "cyrux-099-orbital-tee",
      "eyes-never-lie-tee",
    ],
    bannerImage: "/assets/editorial/hero-desktop.jpg",
    totalPieces: 168,
  },
  {
    id: "drop-00",
    slug: "prototype-zero",
    number: "00",
    chapter: "GENESIS",
    title: "PROTOTYPE ZERO",
    status: "archived",
    releaseDate: {
      tr: "EKİM 2025",
      en: "OCTOBER 2025",
    },
    edition: {
      tr: "50 PARÇA (KASADA SAKLANDI / TÜKENDİ)",
      en: "50 PIECES (VAULTED / SOLD OUT)",
    },
    description: {
      tr: "Cyrux Studio'nun fiziksel giysi formlarını ve siber-noir silüetlerini test ettiği ilk prototip serisi. Tüm drop tükenmiş ve stüdyo kasasına kaldırılmıştır.",
      en: "The experimental genesis run testing Cyrux Studio's brutalist silhouettes and cyber-noir garments. Entire run vaulted in the permanent studio archive.",
    },
    productSlugs: [],
    bannerImage: "/assets/brand/hero-cyber-portrait.webp",
    totalPieces: 50,
  },
  {
    id: "drop-02",
    slug: "neon-predator",
    number: "02",
    chapter: "CHAPTER 01",
    title: "NEON PREDATOR",
    status: "upcoming",
    releaseDate: {
      tr: "OCAK 2027",
      en: "JANUARY 2027",
    },
    edition: {
      tr: "ATÖLYE PROTOTİP AŞAMASINDA",
      en: "IN ATELIER PROTOTYPING",
    },
    description: {
      tr: "Ağır bomber ceketler, modüler fermuarlı kargo pantolonlar ve 3D yansıtıcı mikro-aplikeler. Kıbrıs atölyemizde prototip üretimi devam etmektedir.",
      en: "Heavyweight technical puffers, modular cargo trousers, and specular 3D chrome details. Currently in atelier prototyping in Cyprus.",
    },
    productSlugs: [],
    bannerImage: "/assets/campaign/campaign-card-puffer.webp",
    totalPieces: 120,
  },
];

let memoryCache: DropData[] | null = null;

export function getDropsSync(): DropData[] {
  const node = getNodeModules();
  if (node) {
    try {
      if (node.fs.existsSync(node.dataFile)) {
        const content = node.fs.readFileSync(node.dataFile, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.error("[Drops Storage Error]:", err);
    }
  }

  if (memoryCache && memoryCache.length > 0) {
    return memoryCache;
  }

  if (node) {
    try {
      const dir = node.path.dirname(node.dataFile);
      if (!node.fs.existsSync(dir)) {
        node.fs.mkdirSync(dir, { recursive: true });
      }
      node.fs.writeFileSync(node.dataFile, JSON.stringify(INITIAL_DROPS, null, 2), "utf-8");
    } catch {}
  }

  memoryCache = [...INITIAL_DROPS];
  return memoryCache;
}

export function writeDropsSync(drops: DropData[]): void {
  const node = getNodeModules();
  if (node) {
    try {
      const dir = node.path.dirname(node.dataFile);
      if (!node.fs.existsSync(dir)) {
        node.fs.mkdirSync(dir, { recursive: true });
      }
      node.fs.writeFileSync(node.dataFile, JSON.stringify(drops, null, 2), "utf-8");
      memoryCache = drops;
    } catch (err) {
      console.error("[Drops Write Error]:", err);
      memoryCache = drops;
    }
  } else {
    memoryCache = drops;
  }
}

export async function getDrops(): Promise<DropData[]> {
  return getDropsSync();
}

export function getActiveDrop(): DropData {
  const drops = getDropsSync();
  return drops.find((d) => d.status === "active") || drops[0] || INITIAL_DROPS[0];
}

export function getDropBySlug(slug: string): DropData | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  const drops = getDropsSync();
  return drops.find(
    (d) =>
      d.slug.toLowerCase() === normalized ||
      d.id.toLowerCase() === normalized ||
      d.number.toLowerCase() === normalized
  );
}

export async function saveDrop(data: Partial<DropData> & { title: string; number: string; chapter: string }): Promise<DropData> {
  const drops = getDropsSync();
  const now = new Date().toISOString();

  let dropId = data.id?.trim();
  if (!dropId) {
    dropId = `drop-${Date.now().toString().slice(-6)}`;
  }

  const generatedSlug = (data.slug?.trim() || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");

  const newDrop: DropData = {
    id: dropId,
    slug: generatedSlug,
    number: data.number.trim(),
    chapter: data.chapter.trim(),
    title: data.title.trim().toUpperCase(),
    status: data.status || "upcoming",
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
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const existingIdx = drops.findIndex((d) => d.id === dropId || d.slug === newDrop.slug);

  if (newDrop.status === "active") {
    drops.forEach((d) => {
      if (d.status === "active") d.status = "archived";
    });
  }

  if (existingIdx !== -1) {
    drops[existingIdx] = {
      ...drops[existingIdx],
      ...newDrop,
      createdAt: drops[existingIdx].createdAt || now,
      updatedAt: now,
    };
  } else {
    drops.unshift(newDrop);
  }

  writeDropsSync(drops);
  return newDrop;
}

export async function setActiveDrop(id: string): Promise<DropData | null> {
  const drops = getDropsSync();
  const target = drops.find((d) => d.id === id || d.slug === id);
  if (!target) return null;

  drops.forEach((d) => {
    d.status = d.id === target.id ? "active" : "archived";
    d.updatedAt = new Date().toISOString();
  });

  writeDropsSync(drops);
  return target;
}

export async function deleteDrop(id: string): Promise<boolean> {
  const drops = getDropsSync();
  const idx = drops.findIndex((d) => d.id === id || d.slug === id);
  if (idx === -1) return false;

  drops.splice(idx, 1);

  if (!drops.some((d) => d.status === "active") && drops.length > 0) {
    drops[0].status = "active";
  }

  writeDropsSync(drops);
  return true;
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
