import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/context";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Market Intelligence Suite" },
      { name: "description", content: "Privacy Policy for Market Intelligence Suite." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useI18n();
  return (
    <>
      <div className="bg-mesh" />
      <NavBar signedIn={false} currency="USD" onCurrencyChange={() => {}} ratesUpdatedAt={0} ratesSource="fallback" onRefreshRates={() => {}} />
      <section className="hero">
        <h1><span>{t("privacy.title")}</span></h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text3)" }}>{t("privacy.last_updated")}: July 23, 2026</p>
      </section>
      <div style={{ maxWidth: 720, margin: "0 auto 6rem", padding: "0 2rem", lineHeight: 1.8, color: "var(--text2)", fontSize: "0.9rem" }}>
        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>1. Data We Collect</h3>
        <p><strong>Account data:</strong> Your email address and an authentication token, managed by Supabase Auth. We do not store your password — Supabase handles password hashing.</p>
        <p><strong>Competitor review text:</strong> Text you paste into the Competitor Analysis module. This is stored in Supabase and sent to Anthropic's Claude API for AI analysis.</p>
        <p><strong>SaaS tool inventory:</strong> Tool names, costs, user counts, and usage percentages you enter in the SaaS Audit module. Stored in Supabase.</p>
        <p><strong>Pricing and ROI inputs:</strong> The numeric values you enter in the Pricing and ROI calculators. Stored in Supabase.</p>
        <p><strong>Contact messages:</strong> Name, email, and message text you submit via the About page contact form. Stored in Supabase.</p>
        <p><strong>Preferences:</strong> Your selected language, currency, and theme are stored in your browser's localStorage and optionally synced to your profile in Supabase.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>2. How We Use Your Data</h3>
        <p>Your data is used solely to provide the Service's features: displaying your saved analyses, calculating savings and pricing, and rendering charts. We do not sell your data. We do not use your review text to train AI models — it is sent to Anthropic for one-time analysis and the results are returned to you.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>3. Third-Party Processors</h3>
        <ul style={{ margin: "0.5rem 0 1rem 1.5rem" }}>
          <li><strong>Supabase</strong> — hosts our PostgreSQL database and authentication. Data is encrypted in transit and at rest. See Supabase's privacy policy for details.</li>
          <li><strong>Anthropic (Claude API)</strong> — receives review text you submit for sentiment and topic analysis. Anthropic's API data retention policies apply. See Anthropic's privacy policy for details.</li>
          <li><strong>Frankfurter.app</strong> — provides exchange rate data. No personal data is sent; only a request for currency rates.</li>
          <li><strong>Stripe</strong> — processes Pro plan payments. Stripe handles card data; we never see or store your card information.</li>
        </ul>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>4. Data Security</h3>
        <p>All database tables use Supabase Row Level Security (RLS) policies scoped to your authenticated user ID. This means you can only read and write your own data — no other user (or unauthenticated request) can access it. API keys for Supabase and Anthropic are stored as server-side environment variables and never exposed to the browser.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>5. Data Retention and Deletion</h3>
        <p>Your data persists in Supabase for as long as your account is active. You can delete your account and all associated data at any time by using the "Delete account" button in the dashboard. Deletion is permanent and cannot be undone.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>6. No Review Scraping</h3>
        <p>The Service does not scrape, crawl, or automatically collect reviews from Amazon, Google Play, Trustpilot, or any other platform. You are responsible for providing review text you have legitimately obtained. The Service only analyzes text you explicitly paste into it.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>7. Cookies</h3>
        <p>The Service uses localStorage (not cookies) for preference storage. Supabase Auth uses a JWT token stored in localStorage for session management. No tracking cookies are used.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>8. Your Rights</h3>
        <p>You can access, export, or delete all your data at any time. Use the contact form on the About page for data export requests, or use the in-app "Delete account" feature for immediate deletion.</p>

        <h3 style={{ color: "var(--text)", marginTop: "1.5rem" }}>9. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. Material changes will be reflected in the "Last updated" date above.</p>
      </div>
      <Footer />
    </>
  );
}
