import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/currency";

interface NavProps {
  signedIn: boolean;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  ratesUpdatedAt: number;
  ratesSource: "cache" | "live" | "fallback";
  onRefreshRates: () => void;
}

// One persistent nav bar used on every page (public + authenticated).
// Marketing links (Home, Why, Pricing, About) are always visible.
// Auth-specific controls (currency, theme, language, sign out, delete account)
// appear only when signed in.
export function NavBar({
  signedIn,
  currency,
  onCurrencyChange,
  ratesUpdatedAt,
  ratesSource,
  onRefreshRates,
}: NavProps) {
  const { t, lang, setLang } = useI18n();
  const [theme, setTheme] = useState<"dark" | "light" | "auto">(() =>
    typeof window !== "undefined" ? ((localStorage.getItem("mis_theme") as "dark" | "light" | "auto") || "dark") : "dark",
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () => {
      const resolved = theme === "auto"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : theme;
      document.body.classList.toggle("light-mode", resolved === "light");
    };
    apply();
    localStorage.setItem("mis_theme", theme);
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  const signOut = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const updatedLabel = ratesUpdatedAt > 0
    ? new Date(ratesUpdatedAt).toLocaleString(lang === "ar" ? "ar" : "en-US", { dateStyle: "short", timeStyle: "short" })
    : "—";

  return (
    <nav className="nav">
      <div className="logo">
        <div className="logo-icon">MI</div>
        <span>Market Intelligence</span>
      </div>
      <div className="nav-actions">
        <Link to="/" className="nav-btn">Home</Link>
        <Link to="/value" className="nav-btn">{t("nav.marketing.value")}</Link>
        <Link to="/pricing" className="nav-btn">{t("nav.marketing.pricing")}</Link>
        <Link to="/about" className="nav-btn">{t("nav.marketing.about")}</Link>

        {signedIn ? (
          <>
            <Link to="/app" className="nav-btn">{t("nav.app")}</Link>
            <select
              className="nav-btn"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as Currency)}
              title={t("currency.label")}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </select>
            <span
              style={{ fontSize: "0.7rem", color: "var(--text3)", cursor: "pointer", maxWidth: "120px" }}
              title={`${t("currency.rates_updated")}: ${updatedLabel} (${ratesSource})\n${t("currency.click_refresh")}`}
              onClick={onRefreshRates}
            >
              ⟳ {updatedLabel}
            </span>
            <select
              className="nav-btn"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "dark" | "light" | "auto")}
              title={t("nav.theme")}
            >
              <option value="dark">🌙 {t("theme.dark")}</option>
              <option value="light">☀️ {t("theme.light")}</option>
              <option value="auto">🖥️ {t("theme.auto")}</option>
            </select>
            <button className="nav-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t("nav.language")}</button>
            <button className="nav-btn" onClick={signOut}>{t("nav.signout")}</button>
          </>
        ) : (
          <>
            <button className="nav-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t("nav.language")}</button>
            <Link to="/auth" className="nav-btn">{t("nav.signin")}</Link>
            <Link to="/auth" className="nav-btn primary">{t("nav.start")}</Link>
          </>
        )}
      </div>
    </nav>
  );
}
