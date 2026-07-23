import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Contact — Market Intelligence Suite" },
      { name: "description", content: "Learn about the team behind Market Intelligence Suite and get in touch with questions or feedback." },
      { property: "og:title", content: "About — Market Intelligence Suite" },
      { property: "og:description", content: "Market decisions grounded in data — get in touch." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t, lang, setLang } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name, email: form.email, message: form.message,
    });
    if (error) setStatus("error");
    else { setStatus("sent"); setForm({ name: "", email: "", message: "" }); }
  };

  return (
    <>
      <div className="bg-mesh" />
      <nav className="nav">
        <div className="logo"><div className="logo-icon">MI</div><span>Market Intelligence</span></div>
        <div className="nav-actions">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/app" className="nav-btn">{t("nav.app")}</Link>
          <Link to="/value" className="nav-btn">{t("nav.marketing.value")}</Link>
          <Link to="/pricing" className="nav-btn">{t("nav.marketing.pricing")}</Link>
          <button className="nav-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t("nav.language")}</button>
          <Link to="/auth" className="nav-btn primary">{t("nav.start")}</Link>
        </div>
      </nav>
      <section className="hero">
        <h1><span>{t("about.title")}</span></h1>
        <p>{t("about.body")}</p>
      </section>
      <div style={{ maxWidth: 560, margin: "0 auto 6rem", padding: "0 2rem" }}>
        <div className="card">
          <div className="card-header"><div className="card-title">✉️ {t("about.contact.title")}</div></div>
          <form onSubmit={submit}>
            <div className="input-group">
              <label>{t("about.contact.name")}</label>
              <input className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label>{t("about.contact.email")}</label>
              <input className="input-field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="input-group">
              <label>{t("about.contact.message")}</label>
              <textarea className="input-field" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "…" : t("about.contact.send")}
            </button>
            {status === "sent" && <div className="insight-box success" style={{ marginTop: "1rem" }}>{t("about.contact.sent")}</div>}
            {status === "error" && <div className="insight-box danger" style={{ marginTop: "1rem" }}>{t("about.contact.error")}</div>}
          </form>
        </div>
      </div>
      <div className="footer">{t("footer.tagline")}</div>
    </>
  );
}
