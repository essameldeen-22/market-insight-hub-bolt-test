import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/context";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/value")({
  head: () => ({
    meta: [
      { title: "Why Market Intelligence Suite — Turn Noise Into Decisions" },
      { name: "description", content: "Cut SaaS spend, price with evidence, and spot product opportunities before competitors. See how the suite maps problem to solution to outcome." },
      { property: "og:title", content: "Why Market Intelligence Suite" },
      { property: "og:description", content: "From messy reviews and SaaS invoices to profitable decisions." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/value" },
    ],
    links: [{ rel: "canonical", href: "/value" }],
  }),
  component: ValuePage,
});

function ValuePage() {
  const { t } = useI18n();
  return (
    <>
      <div className="bg-mesh" />
      <NavBar signedIn={false} currency="USD" onCurrencyChange={() => {}} ratesUpdatedAt={0} ratesSource="fallback" onRefreshRates={() => {}} />
      <section className="hero">
        <h1><span>{t("value.title")}</span></h1>
        <p>{t("value.subtitle")}</p>
      </section>
      <div className="tools-grid">
        <div className="tool-card"><div className="tool-icon orange">⚠️</div><h3>{t("value.problem.title")}</h3><p>{t("value.problem.body")}</p></div>
        <div className="tool-card"><div className="tool-icon purple">💡</div><h3>{t("value.solution.title")}</h3><p>{t("value.solution.body")}</p></div>
        <div className="tool-card"><div className="tool-icon green">🎯</div><h3>{t("value.outcomes.title")}</h3><p>• {t("value.outcomes.a")}<br />• {t("value.outcomes.b")}<br />• {t("value.outcomes.c")}</p></div>
      </div>
      <Footer />
    </>
  );
}
