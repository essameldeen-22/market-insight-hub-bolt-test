import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Market Intelligence Suite" },
      { name: "description", content: "Simple, transparent plans. Start free with every module. Upgrade for multi-product analysis, priority support, and team seats." },
      { property: "og:title", content: "Pricing — Market Intelligence Suite" },
      { property: "og:description", content: "Free, Pro, and Team plans for competitor analysis, SaaS audit, pricing and ROI." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useI18n();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setUpgradeMsg(null);
    try {
      // PLACEHOLDER: When Stripe is configured, this will call the
      // stripe-checkout edge function which returns a Stripe Checkout URL.
      // The frontend will then redirect to that URL.
      //
      // const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      //   body: JSON.stringify({ success_url: window.location.origin + "/app?upgrade=success", cancel_url: window.location.origin + "/pricing?upgrade=cancelled" }),
      // });
      // const { url } = await res.json();
      // window.location.href = url;

      // For now, show a placeholder message
      setUpgradeMsg("Payments are not yet active. The new owner needs to connect a Stripe account to enable checkout.");
    } catch {
      setUpgradeMsg("Could not start checkout. Please try again later.");
    } finally {
      setUpgrading(false);
    }
  };

  const plans = [
    {
      key: "free", klass: "purple",
      name: t("pricing.free.name"), price: t("pricing.free.price"), desc: t("pricing.free.desc"),
      features: [t("pricing.feat.analysis"), t("pricing.feat.saas"), t("pricing.feat.pricing"), t("pricing.feat.roi")],
      cta: t("pricing.cta"), ctaLink: "/auth",
    },
    {
      key: "pro", klass: "green",
      name: t("pricing.pro.name"), price: t("pricing.pro.price"), desc: t("pricing.pro.desc"),
      features: [t("pricing.feat.analysis"), t("pricing.feat.saas"), t("pricing.feat.pricing"), t("pricing.feat.roi"), t("pricing.feat.multi"), t("pricing.feat.export")],
      highlight: true,
      cta: t("pricing.pro.cta") || "Upgrade to Pro", ctaLink: null,
    },
    {
      key: "team", klass: "blue",
      name: t("pricing.team.name"), price: t("pricing.team.price"), desc: t("pricing.team.desc"),
      features: [t("pricing.feat.analysis"), t("pricing.feat.saas"), t("pricing.feat.pricing"), t("pricing.feat.roi"), t("pricing.feat.multi"), t("pricing.feat.export"), t("pricing.feat.priority")],
      cta: t("pricing.team.cta") || "Coming Soon", ctaLink: null, disabled: true,
    },
  ];

  return (
    <>
      <div className="bg-mesh" />
      <NavBar signedIn={false} currency="USD" onCurrencyChange={() => {}} ratesUpdatedAt={0} ratesSource="fallback" onRefreshRates={() => {}} />
      <section className="hero">
        <h1><span>{t("pricing.title")}</span></h1>
        <p>{t("pricing.subtitle")}</p>
      </section>
      <div className="tools-grid">
        {plans.map((p) => (
          <div key={p.key} className={`tool-card ${p.highlight ? "active" : ""}`}>
            <div className={`tool-icon ${p.klass}`}>{p.key === "free" ? "🚀" : p.key === "pro" ? "⭐" : "👥"}</div>
            <h3>{p.name}</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0.5rem 0" }}>{p.price}</p>
            <p>{p.desc}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0", textAlign: "start" }}>
              {p.features.map((f) => (
                <li key={f} style={{ fontSize: "0.85rem", color: "var(--text2)", padding: "0.25rem 0" }}>✓ {f}</li>
              ))}
            </ul>
            {p.disabled ? (
              <button className="nav-btn" disabled style={{ opacity: 0.6, cursor: "not-allowed", display: "inline-block", marginTop: "0.5rem" }}>
                {p.cta}
              </button>
            ) : p.ctaLink ? (
              <a href={p.ctaLink} className="nav-btn primary" style={{ display: "inline-block", marginTop: "0.5rem" }}>{p.cta}</a>
            ) : (
              <button
                className="nav-btn primary"
                style={{ display: "inline-block", marginTop: "0.5rem" }}
                onClick={handleUpgrade}
                disabled={upgrading}
              >
                {upgrading ? "..." : p.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      {upgradeMsg && (
        <div style={{ textAlign: "center", padding: "1rem 2rem 2rem" }}>
          <div className="insight-box info" style={{ maxWidth: 480, margin: "0 auto" }}>
            {upgradeMsg}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
