import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SUPPORTED_LANGS, TRANSLATIONS, tKey, type Lang } from "./dictionaries";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "rtl" | "ltr";
}

const Ctx = createContext<I18nCtx | null>(null);

function detectInitial(): Lang {
  if (typeof window === "undefined") return "ar";
  try {
    const saved = localStorage.getItem("mis_lang");
    if (saved && (SUPPORTED_LANGS as string[]).includes(saved)) return saved as Lang;
  } catch {
    /* storage disabled */
  }
  const nav = navigator.language?.slice(0, 2);
  return nav === "en" ? "en" : "ar";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Read persisted language synchronously on the client. This eliminates the
  // flash where routes briefly rendered the SSR default ("ar") before an
  // effect swapped in the saved value. On the server we render "ar"; on the
  // client the very first paint uses the persisted value.
  const [lang, setLangState] = useState<Lang>(() =>
    typeof window === "undefined" ? "ar" : detectInitial(),
  );
  const hydrated = useRef(typeof window !== "undefined");

  useEffect(() => {
    // After hydration, re-sync in case another tab changed storage.
    const detected = detectInitial();
    if (detected !== lang) setLangState(detected);
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    if (hydrated.current) {
      try { localStorage.setItem("mis_lang", lang); } catch { /* ignore */ }
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    hydrated.current = true;
    setLangState(l);
  }, []);
  const dict = TRANSLATIONS[lang];
  const t = useCallback((key: string, vars?: Record<string, string | number>) => tKey(dict, key, vars), [dict]);

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within LanguageProvider");
  return c;
}
