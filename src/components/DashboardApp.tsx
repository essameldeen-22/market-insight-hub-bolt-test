import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/i18n/context";
import { type Currency } from "@/lib/currency";
import { useCurrencyRates } from "@/hooks/use-currency-rates";
import { deleteMyAccount } from "@/lib/account.functions";
import { NavBar } from "@/components/NavBar";
import { CompetitorAnalysis } from "@/components/modules/CompetitorAnalysis";
import { SaasAudit } from "@/components/modules/SaasAudit";
import { PricingCalculator } from "@/components/modules/PricingCalculator";
import { RoiCalculator } from "@/components/modules/RoiCalculator";

type ModuleKey = "competitor" | "saas" | "pricing" | "roi";

export function DashboardApp() {
  const { t } = useI18n();
  const [active, setActive] = useState<ModuleKey>("competitor");
  const [currency, setCurrency] = useState<Currency>(() =>
    typeof window !== "undefined" ? ((localStorage.getItem("mis_currency") as Currency) || "USD") : "USD",
  );
  const { rates, updatedAt, source, refresh } = useCurrencyRates();

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("mis_currency", currency);
  }, [currency]);

  // Keyboard shortcuts: Alt+1..4 to switch modules
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const keys: Record<string, ModuleKey> = { "1": "competitor", "2": "saas", "3": "pricing", "4": "roi" };
      const k = keys[e.key];
      if (k) { e.preventDefault(); setActive(k); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const deleteAcct = useServerFn(deleteMyAccount);
  const [deleting, setDeleting] = useState(false);
  const runDelete = async () => {
    if (!window.confirm(`${t("delete.confirm_title")}\n\n${t("delete.confirm_body")}`)) return;
    setDeleting(true);
    try {
      await deleteAcct();
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      setDeleting(false);
      window.alert(t("delete.error") + (e instanceof Error ? `\n${e.message}` : ""));
    }
  };

  const cards: { key: ModuleKey; icon: string; klass: string; title: string; desc: string; badge: string; shortcut: string }[] = [
    { key: "competitor", icon: "📊", klass: "purple", title: t("cards.competitor.title"), desc: t("cards.competitor.desc"), badge: t("cards.competitor.badge"), shortcut: "Alt+1" },
    { key: "saas", icon: "💼", klass: "orange", title: t("cards.saas.title"), desc: t("cards.saas.desc"), badge: t("cards.saas.badge"), shortcut: "Alt+2" },
    { key: "pricing", icon: "💰", klass: "green", title: t("cards.pricing.title"), desc: t("cards.pricing.desc"), badge: t("cards.pricing.badge"), shortcut: "Alt+3" },
    { key: "roi", icon: "📈", klass: "blue", title: t("cards.roi.title"), desc: t("cards.roi.desc"), badge: t("cards.roi.badge"), shortcut: "Alt+4" },
  ];

  return (
    <>
      <div className="bg-mesh" />
      <NavBar
        signedIn
        currency={currency}
        onCurrencyChange={setCurrency}
        ratesUpdatedAt={updatedAt}
        ratesSource={source}
        onRefreshRates={refresh}
      />

      <section className="hero" style={{ paddingBottom: "1.5rem" }}>
        <div className="badge"><span className="badge-dot" />{t("hero.badge")}</div>
        <h1><span>{t("hero.title.a")}</span> {t("hero.title.b")}</h1>
      </section>

      <div className="tools-grid">
        {cards.map((c) => (
          <div key={c.key} className={`tool-card ${active === c.key ? "active" : ""}`} onClick={() => setActive(c.key)}>
            <div className={`tool-icon ${c.klass}`}>{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <span className="tool-badge">{c.badge}</span>
              <span className="tool-badge" style={{ fontFamily: "monospace" }}>{c.shortcut}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`app-panel ${active === "competitor" ? "active" : ""}`}>{active === "competitor" && <CompetitorAnalysis />}</div>
      <div className={`app-panel ${active === "saas" ? "active" : ""}`}>{active === "saas" && <SaasAudit currency={currency} rates={rates} />}</div>
      <div className={`app-panel ${active === "pricing" ? "active" : ""}`}>{active === "pricing" && <PricingCalculator currency={currency} rates={rates} />}</div>
      <div className={`app-panel ${active === "roi" ? "active" : ""}`}>{active === "roi" && <RoiCalculator currency={currency} rates={rates} />}</div>

      <div className="footer">
        {t("footer.tagline")}
        <div style={{ marginTop: "0.5rem" }}>
          <a href="/terms" style={{ color: "var(--text2)", marginInlineEnd: "1rem" }}>{t("footer.terms")}</a>
          <a href="/privacy" style={{ color: "var(--text2)" }}>{t("footer.privacy")}</a>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "1rem 2rem 3rem" }}>
        <button className="nav-btn" onClick={runDelete} disabled={deleting} style={{ color: "var(--danger)" }}>
          {deleting ? t("delete.deleting") : `🗑 ${t("nav.delete_account")}`}
        </button>
      </div>
    </>
  );
}
