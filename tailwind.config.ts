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
        cream: {
          DEFAULT: "#FAF8F3",
          muted: "#E2DED4",
          subtle: "#C5BFB2",
        },
        dark: {
          hero: "#080808",
          card: "#121212",
          border: "#1E1E1E",
        },
        brand: {
          black: "#0A0A0A",
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
        sekuya: ["var(--font-sekuya)", "Sekuya", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
