import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { EN } from "@/locales/en/index";

export type Lang = "tr" | "en";

const STORAGE_KEY = "bielat_lang";

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (tr: string, vars?: Record<string, string | number>) => string;
};

const interpolate = (s: string, vars?: Record<string, string | number>) => {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
};

export const detectInitialLang = (): Lang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "tr" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language?.toLowerCase() ?? "" : "";
  return nav.startsWith("tr") ? "tr" : "en";
};

/** Language outside of React (edge cases: helpers, lib modules) */
let currentLang: Lang = typeof window !== "undefined" ? detectInitialLang() : "tr";
export const getLang = (): Lang => currentLang;

/** Translate a Turkish source string. Usable outside React. */
export const translate = (tr: string, vars?: Record<string, string | number>, lang: Lang = currentLang) => {
  if (lang === "tr") return interpolate(tr, vars);
  return interpolate(EN[tr] ?? tr, vars);
};

const I18nContext = createContext<I18nContextType>({
  lang: "tr",
  setLang: () => {},
  t: (tr, vars) => interpolate(tr, vars),
});

export const useI18n = () => useContext(I18nContext);

/** Shorthand hook: const t = useT(); t("Merhaba") */
export const useT = () => useI18n().t;

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  useEffect(() => {
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (tr: string, vars?: Record<string, string | number>) => translate(tr, vars, lang),
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
