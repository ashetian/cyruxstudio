# Milestone 1 Scaffolding Specification: Core Next.js Skeleton & Configuration

**Author**: Explorer 1 (`teamwork_preview_explorer_m1_1`)  
**Milestone**: M1 (Core Skeleton & Database)  
**Target Environment**: Linux, Node.js v26.10.0, npm 12.2.0  
**Stack**: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 3.4, GSAP, Framer Motion 12, Lenis, Jose, Zod, Vercel Blob, ElevenLabs JS, Prisma 6 + Neon Serverless

---

## 1. Executive Summary & Verification Outcome

All dependencies, configurations, type-checking (`tsc --noEmit`), linting (`next lint`), and production building (`next build`) have been empirically verified in an isolated sandbox environment. The packages build cleanly without peer dependency conflicts when paired with React 19 and Next.js 15.

Key findings:
1. **React 19 & Next.js 15 Compatibility**: `framer-motion@12.4.3` natively supports `react: ^18.0.0 || ^19.0.0`. `lucide-react@0.475.0` natively supports `react: ^19.0.0`.
2. **Lenis Integration**: The modern package name is `lenis` (`^1.1.20`) which provides `lenis/react` (`ReactLenis`) directly without deprecated subpackages.
3. **ElevenLabs Official Package**: The deprecated `elevenlabs` package redirects to `@elevenlabs/elevenlabs-js` (`^2.78.0`). Both are specified to support any invocation pattern while ensuring full compatibility with `elevenlabs onboard check --answered --env-path .env.local`.
4. **Prisma & Neon Serverless**: Prisma 6 (`@prisma/client@6.4.0` / `prisma@6.4.0`) natively supports Neon driver adapters without requiring legacy preview flags.
5. **ESLint 9 Flat Config**: Next.js 15 supports ESLint 9 using `eslint.config.mjs` with `@eslint/eslintrc` `FlatCompat`.

---

## 2. File Specifications

### 2.1 `package.json`
Target file: `/home/ashetian/Desktop/cyruxstudio/package.json`

```json
{
  "name": "cyruxstudio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@elevenlabs/elevenlabs-js": "^2.78.0",
    "@neondatabase/serverless": "^0.10.4",
    "@prisma/adapter-neon": "^6.4.0",
    "@prisma/client": "^6.4.0",
    "@vercel/blob": "^0.27.1",
    "clsx": "^2.1.1",
    "elevenlabs": "^1.59.0",
    "framer-motion": "^12.4.3",
    "gsap": "^3.12.7",
    "jose": "^5.9.6",
    "lenis": "^1.1.20",
    "lucide-react": "^0.475.0",
    "next": "^15.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.0.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.20.1",
    "eslint-config-next": "^15.2.0",
    "postcss": "^8.5.2",
    "prisma": "^6.4.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

---

### 2.2 `tsconfig.json`
Target file: `/home/ashetian/Desktop/cyruxstudio/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### 2.3 `tailwind.config.ts`
Target file: `/home/ashetian/Desktop/cyruxstudio/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F5EE",
        dark: {
          hero: "#080808",
          card: "#121212",
          border: "#1E1E1E",
        },
        cream: {
          DEFAULT: "#FAF8F3",
          muted: "#E2DED4",
          subtle: "#C5BFB2",
        },
        brand: {
          black: "#080808",
          ecru: "#F7F5EE",
          cream: "#FAF8F3",
          accent: "#111111",
          border: "#E5E3DC",
          muted: "#767676",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 2.4 `postcss.config.mjs`
Target file: `/home/ashetian/Desktop/cyruxstudio/postcss.config.mjs`

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

---

### 2.5 `next.config.ts`
Target file: `/home/ashetian/Desktop/cyruxstudio/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

---

### 2.6 `eslint.config.mjs`
Target file: `/home/ashetian/Desktop/cyruxstudio/eslint.config.mjs`

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

---

### 2.7 `src/app/globals.css`
Target file: `/home/ashetian/Desktop/cyruxstudio/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #F7F5EE;
  --foreground: #080808;
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
```

---

### 2.8 Base Utility: `src/lib/utils.ts`
Target file: `/home/ashetian/Desktop/cyruxstudio/src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Step-by-Step Implementation Sequence for M1 Builder

1. **Root Scaffolding**:
   - Create `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, and `eslint.config.mjs`.
2. **Dependency Installation**:
   - Run `npm install`
   - Handle npm 12 script approval for Prisma engines if prompted (`npm install-scripts approve prisma @prisma/client @prisma/engines esbuild` or run with scripts enabled).
3. **Prisma Setup**:
   - Create `prisma/schema.prisma` with models `Product`, `StoreSettings`, `ElevenLabsAsset`, `CreditUsageLog`.
   - Run `npx prisma generate` to populate `@prisma/client`.
4. **App Directory Skeleton**:
   - Create `src/app/globals.css`, `src/app/layout.tsx`, and `src/app/page.tsx`.
   - Create `src/lib/utils.ts` for styling convenience.
5. **Quality Gate Verification**:
   - Run `npx tsc --noEmit` -> Must return exit code 0.
   - Run `npm run lint` -> Must return exit code 0.
   - Run `npm run build` -> Must output compiled Next.js routes and exit code 0.
