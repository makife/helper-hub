import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { EN } from "@/locales/en/index";
import { AR } from "@/locales/ar/index";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "tr" | "en" | "ar";

const STORAGE_KEY = "bielat_lang";

const LANGS: Lang[] = ["tr", "en", "ar"];
const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as string[]).includes(v);

const DICTS: Record<Lang, Record<string, string> | null> = {
  tr: null,
  en: EN,
  ar: AR,
};

/** BCP47 locale used for date/number formatting */
export const localeTag = (lang: Lang = getLang()) =>
  lang === "en" ? "en-US" : lang === "ar" ? "ar" : "tr-TR";

export const isRtl = (lang: Lang) => lang === "ar";

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
    if (isLang(stored)) return stored;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language?.toLowerCase() ?? "" : "";
  if (nav.startsWith("tr")) return "tr";
  if (nav.startsWith("ar")) return "ar";
  return "en";
};

/** Language outside of React (edge cases: helpers, lib modules) */
let currentLang: Lang = typeof window !== "undefined" ? detectInitialLang() : "tr";
export const getLang = (): Lang => currentLang;

/** Translate a Turkish source string. Usable outside React. */
export const translate = (tr: string, vars?: Record<string, string | number>, lang: Lang = currentLang) => {
  const dict = DICTS[lang];
  if (!dict) return interpolate(tr, vars);
  return interpolate(dict[tr] ?? EN[tr] ?? tr, vars);
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
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
    }
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled && isLang(data?.language)) {
        setLangState(data.language as Lang);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (tr: string, vars?: Record<string, string | number>) => translate(tr, vars, lang),
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
