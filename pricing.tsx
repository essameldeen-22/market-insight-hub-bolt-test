import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/context";

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
  const { t, lang, setLang } = useI18n();
  const plans = [
    {
      key: "free", klass: "purple",
      name: t("pricing.free.name"), price: t("pricing.free.price"), desc: t("pricing.free.desc"),
      features: [t("pricing.feat.analysis"), t("pricing.feat.saas"), t("pricing.feat.pricing"), t("pricing.feat.roi")],
    },
    {
      key: "pro", klass: "green",
      name: t("pricing.pro.name"), price: t("pricing.pro.price"), desc: t("pricing.pro.desc"),
      features: [t("pricing.feat.analysis"), t("pricing.feat.saas"), t("pricing.feat.pricing"), t("pricing.feat.roi"), t("pricing.feat.multi"), t("pricing.feat.export")],
      highlight: true,
    },
    {
      key: "team", klass: "blue",
      name: t("pricing.team.name"), price: t("pricing.team.price"), desc: t("pricing.team.desc"),
      features: [t("pricing.feat.analysis"), t("pricing.feat.saas"), t("pricing.feat.pricing"), t("pricing.feat.roi"), t("pricing.feat.multi"), t("pricing.feat.export"), t("pricing.feat.priority")],
    },
  ];
  return (
    <>
      <div className="bg-mesh" />
      <nav className="nav">
        <div className="logo"><div className="logo-icon">MI</div><span>Market Intelligence</span></div>
        <div className="nav-actions">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/app" className="nav-btn">{t("nav.app")}</Link>
          <Link to="/value" className="nav-btn">{t("nav.marketing.value")}</Link>
          <Link to="/about" className="nav-btn">{t("nav.marketing.about")}</Link>
          <button className="nav-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t("nav.language")}</button>
          <Link to="/auth" className="nav-btn primary">{t("nav.start")}</Link>
        </div>
      </nav>
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
            <Link to="/auth" className="nav-btn primary" style={{ display: "inline-block", marginTop: "0.5rem" }}>{t("pricing.cta")}</Link>
          </div>
        ))}
      </div>
      <div className="footer">{t("footer.tagline")}</div>
    </>
  );
}
