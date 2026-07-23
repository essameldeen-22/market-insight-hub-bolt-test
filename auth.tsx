import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/i18n/context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Market Intelligence Suite" },
      { name: "description", content: "Sign in to your Market Intelligence Suite dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        setInfo(t("auth.check_email"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.invalidate();
        navigate({ to: "/app" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error instanceof Error ? result.error.message : String(result.error));
      return;
    }
    if (result.redirected) return;
    router.invalidate();
    navigate({ to: "/app" });
  };

  return (
    <>
      <div className="bg-mesh" />
      <div className="auth-page">
        <div className="auth-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Link to="/" className="nav-btn" style={{ padding: "0.35rem 0.75rem" }}>
              ← {lang === "ar" ? "الرئيسية" : "Home"}
            </Link>
            <button className="nav-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {t("nav.language")}
            </button>
          </div>
          <h1>{mode === "signin" ? t("auth.title") : t("auth.title_signup")}</h1>
          <p className="sub">{mode === "signin" ? t("auth.subtitle") : t("auth.subtitle_signup")}</p>

          <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={onGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {t("auth.google")}
          </button>

          <div className="divider">{t("auth.or")}</div>

          <form onSubmit={onSubmit}>
            <div className="input-group">
              <label>{t("auth.email")}</label>
              <input className="input-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="input-group">
              <label>{t("auth.password")}</label>
              <input className="input-field" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            {error && <div className="insight-box danger">{error}</div>}
            {info && <div className="insight-box success">{info}</div>}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} type="submit" disabled={loading}>
              {loading ? "..." : mode === "signin" ? t("auth.signin") : t("auth.signup")}
            </button>
          </form>

          <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text2)" }}>
            {mode === "signin" ? t("auth.no_account") : t("auth.have_account")}{" "}
            <button className="link-btn" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}>
              {mode === "signin" ? t("auth.signup") : t("auth.signin")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
