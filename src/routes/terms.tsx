import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/context";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Market Intelligence Suite" },
      { name: "description", content: "Terms of Service for Market Intelligence Suite." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useI18n();
  return (
    <>
      <div className="bg-mesh" />
      <NavBar signedIn={false} currency="USD" onCurrencyChange={() => {}} ratesUpdatedAt={0} ratesSource="fallback" onRefreshRates={() => {}} />
      <section className="hero">
        <h1><span>{t("terms.title")}</span></h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text3)" }}>{t("terms.last_updated")}: July 23, 2026</p>
      </section>
      <div style={{ maxWidth: 720, margin: "0 auto 6rem", padding: "0 2rem", lineHeight: 1.8, color: "var(--text2)", fontSize: "0.9rem" }}>
        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>1. Acceptance of Terms</h3>
        <p>By creating an account or using Market Intelligence Suite ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>2. Description of Service</h3>
        <p>Market Intelligence Suite provides four modules:</p>
        <ul style={{ margin: "0.5rem 0 1rem 1.5rem" }}>
          <li><strong>Competitor Review Analysis</strong> — you paste product review text, which is sent to Anthropic's Claude API for AI-powered sentiment and topic analysis.</li>
          <li><strong>SaaS Spend Audit</strong> — you enter your software tool inventory (name, cost, users, usage) and the Service calculates potential savings and migration plans.</li>
          <li><strong>Pricing Calculator</strong> — you enter cost, customer, and competitor data and the Service calculates suggested pricing.</li>
          <li><strong>ROI Calculator</strong> — you enter investment costs and expected returns and the Service calculates ROI metrics.</li>
        </ul>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>3. Accounts and Data</h3>
        <p>You must create an account to use the dashboard. Your account email and password are managed by Supabase authentication. All data you enter — competitor review text, SaaS tool inventories, pricing inputs, and ROI inputs — is stored in a Supabase PostgreSQL database and is scoped to your account via row-level security policies. You can delete your account and all associated data at any time from the dashboard.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>4. Third-Party Services</h3>
        <p>The Service sends review text you submit to Anthropic's Claude API for analysis. Anthropic's data retention and privacy policies apply to that transmission. The Service also uses Supabase for data storage and Frankfurter.app for exchange rate data.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>5. Free and Pro Plans</h3>
        <p>The Free plan provides access to all four modules with a monthly limit on AI competitor analyses. The Pro plan (paid via Stripe) removes this limit and adds multi-product comparison and PDF export. Pro subscriptions are billed monthly and can be cancelled at any time; access continues until the end of the billing period.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>6. Acceptable Use</h3>
        <p>You agree not to: (a) submit content you do not have the right to share, (b) attempt to scrape or reverse-engineer the Service, (c) use the Service for any unlawful purpose, or (d) abuse or overload the Service's infrastructure. The Service does not scrape reviews from any platform — you are responsible for providing review text you have legitimately obtained.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>7. Disclaimer</h3>
        <p>The Service provides analysis and calculations for informational purposes only. Pricing suggestions, ROI projections, and savings estimates are not financial advice. SaaS savings percentages are estimates based on market averages, not guaranteed quotes.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>8. Limitation of Liability</h3>
        <p>The Service is provided "as is" without warranties of any kind. We are not liable for any decisions made based on the Service's output, including pricing decisions, investment decisions, or migration plans.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>9. Changes</h3>
        <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>10. Contact</h3>
        <p>For questions about these Terms, use the contact form on the About page.</p>
      </div>
      <Footer />
    </>
  );
}
