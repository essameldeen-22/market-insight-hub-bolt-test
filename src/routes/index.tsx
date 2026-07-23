import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Market Intelligence Suite — Competitor Analysis, SaaS Audit, Pricing & ROI" },
      { name: "description", content: "Analyze competitor reviews with AI, audit your SaaS stack, calculate optimal pricing and ROI. Arabic & English, multi-currency." },
      { property: "og:title", content: "Market Intelligence Suite" },
      { property: "og:description", content: "AI-powered competitor analysis, SaaS cost optimization, pricing & ROI calculators — Arabic & English." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const cards = [
    { icon: "📊", klass: "purple", title: t("cards.competitor.title"), desc: t("cards.competitor.desc"), badge: t("cards.competitor.badge") },
    { icon: "💼", klass: "orange", title: t("cards.saas.title"), desc: t("cards.saas.desc"), badge: t("cards.saas.badge") },
    { icon: "💰", klass: "green", title: t("cards.pricing.title"), desc: t("cards.pricing.desc"), badge: t("cards.pricing.badge") },
    { icon: "📈", klass: "blue", title: t("cards.roi.title"), desc: t("cards.roi.desc"), badge: t("cards.roi.badge") },
  ];

  const cta = () => {
    if (signedIn) navigate({ to: "/app" });
    else navigate({ to: "/auth" });
  };

  return (
    <>
      <div className="bg-mesh" />
      <NavBar signedIn={signedIn} currency="USD" onCurrencyChange={() => {}} ratesUpdatedAt={0} ratesSource="fallback" onRefreshRates={() => {}} />

      <section className="hero">
        <div className="badge"><span className="badge-dot" />{t("hero.badge")}</div>
        <h1><span>{t("hero.title.a")}</span> {t("hero.title.b")}</h1>
        <p>{t("hero.subtitle")}</p>
        <button className="nav-btn primary" style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }} onClick={cta}>{t("hero.cta")} →</button>
      </section>

      <div className="tools-grid">
        {cards.map((c) => (
          <div key={c.title} className="tool-card" onClick={cta}>
            <div className={`tool-icon ${c.klass}`}>{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="tool-badge">{c.badge}</span>
          </div>
        ))}
      </div>

      <Footer />
    </>
  );
}
