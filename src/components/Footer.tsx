import { Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/context";

export function Footer() {
  const { t } = useI18n();
  return (
    <div className="footer">
      {t("footer.tagline")}
      <div style={{ marginTop: "0.5rem" }}>
        <Link to="/terms" style={{ color: "var(--text2)", marginInlineEnd: "1rem" }}>{t("footer.terms")}</Link>
        <Link to="/privacy" style={{ color: "var(--text2)" }}>{t("footer.privacy")}</Link>
      </div>
    </div>
  );
}
