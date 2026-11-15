"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Language = "tr" | "en";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (dict: { tr: string; en: string }) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "cyrux_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("tr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === "tr" || saved === "en") {
        setLangState(saved);
      } else {
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith("tr")) {
          setLangState("tr");
        } else {
          setLangState("en");
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  const setLang = React.useCallback((nextLang: Language) => {
    setLangState(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
    } catch {
      // Ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLang;
    }
  }, []);

  const toggleLang = React.useCallback(() => {
    setLangState((curr) => {
      const next = curr === "tr" ? "en" : "tr";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t: (dict: { tr: string; en: string }) => dict[lang] || dict.en,
    }),
    [lang, setLang, toggleLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Default fallback if used outside provider
    return {
      lang: "tr" as Language,
      setLang: () => {},
      toggleLang: () => {},
      t: (dict: { tr: string; en: string }) => dict.tr,
    };
  }
  return ctx;
}
