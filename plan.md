
# Market Intelligence Suite — Phased Rebuild Plan

Goal: convert the single-file HTML app into a proper full-stack app while preserving 100% of the visual design (dark theme, indigo/purple accents, Inter + Noto Sans Arabic) and all existing formulas, sentiment topic taxonomy, and SaaS alternatives database exactly as-is.

Delivered in 3 phases so you get a working deployed URL to test after Phase 1.

---

## Phase 1 — Foundation (this build)

Ship a working deployed app with the 4 modules functional, real Claude AI, auth, persistence, and EN/AR i18n.

### 1. Architecture migration
- Convert the HTML file into a React app on the existing TanStack Start + Lovable Cloud (Supabase) stack.
- Bundle all UI libs as npm dependencies (no CDN `<script>`/`<link>`):
  - Icons: `lucide-react` (map Font Awesome icon names 1:1 to Lucide equivalents).
  - Charts: `chart.js` + `react-chartjs-2`.
  - PDF export: `jspdf` + `html2canvas`.
  - Fonts: `@fontsource-variable/inter` + `@fontsource/noto-sans-arabic`, imported in `src/styles.css`.
- Port the existing CSS variables (dark + light mode palettes, gradients, shadows) into `src/styles.css` as-is so the design is pixel-identical.
- Split the 4 modules into components under `src/components/modules/`:
  - `CompetitorAnalysis.tsx`
  - `SaasAudit.tsx`
  - `PricingCalculator.tsx`
  - `RoiCalculator.tsx`
- Preserve all existing formulas and the SaaS alternatives database verbatim in `src/lib/` (moved from inline JS, not rewritten).

### 2. Auth + persistence (Lovable Cloud)
- Enable Lovable Cloud.
- Auth: email/password + Google sign-in (via the managed Lovable broker).
- Postgres schema (all tables + GRANTs + RLS scoped to `auth.uid()`):
  - `competitor_analyses` — user's saved competitor reviews and Claude results.
  - `saas_tools` — user's SaaS tool inventory rows.
  - `pricing_inputs` — pricing calculator saved states.
  - `roi_inputs` — ROI calculator saved states.
  - `contact_messages` — for the About/Contact form (Phase 2, table created now).
- Replace localStorage autosave with server persistence (debounced writes), keyed to the signed-in user.
- Protected app routes live under `_authenticated/`; landing page stays public.

### 3. Real Claude AI (server-side)
- TanStack server function `analyzeReviews` in `src/lib/claude.functions.ts` (helpers in `src/lib/claude.server.ts` per serverfn-split rule).
- Calls `api.anthropic.com/v1/messages` with `claude-haiku-*` (latest Haiku), reading `ANTHROPIC_API_KEY` from `process.env` **inside** the handler.
- Structured JSON output matching the existing topic taxonomy (sound quality, battery, comfort, connectivity, design, price, performance, build quality) so current UI rendering (topic bars, pain points, strengths) works unchanged.
- I'll request the `ANTHROPIC_API_KEY` secret via the secrets tool once the scaffold is in place — not hardcoded, not asked in chat.
- Old keyword engine removed from the client.

### 4. i18n (EN + AR only, extensible)
- `src/i18n/` with `en.ts`, `ar.ts` dictionaries, a `useT()` hook, and a `<LanguageProvider>` that sets `<html lang dir>`.
- Extend the existing `TRANSLATIONS` keys to cover every user-facing string, including dynamic insights, alerts, and report content (templated with interpolation).
- RTL/LTR switched via `dir` attribute + Tailwind logical properties.
- Numeric inputs force Latin digits regardless of locale (bug fix from old version).
- Structured so adding fr/es/it/ja/ru later is a dictionary-only change.

### 5. Routes (Phase 1 subset)
- `/` — landing page (public, keeps existing hero copy, SEO meta + OG tags).
- `/auth` — sign-in / sign-up.
- `/_authenticated/app` — the 4-module workspace (tabbed, same layout as current HTML).

### 6. Section 6 features (only the 3 you picked)
- Multi-competitor comparison: Competitor module accepts 2–3 products side-by-side; Claude call runs per product; results rendered in a comparison view.
- Multi-currency display: EGP / SAR / AED / USD with fixed default rates + a simple settings toggle; currency stored per user.
- Keyboard shortcuts: Tab between fields, Enter to add a new SaaS row (and equivalents in other tables).

### 7. Explicitly deferred to Phase 2/3
- Pricing page, About/Contact page, onboarding tour, designed empty states, skeleton loaders, favicon + OG image, "Auto" theme mode.
- CSV bulk import for SaaS, real-migration-cost calculator, undo/redo.

### 8. Explicitly NOT built (per your instructions)
- No Amazon/Google review scraping.
- No Stripe/payments yet (clean integration point left in code).

---

## Phase 2 — Pages & polish (next build)

- `/pricing` (placeholder plan structure), `/about`, `/contact` (writes to `contact_messages`).
- Onboarding tour (first-time users).
- Designed empty states + skeleton loaders.
- Favicon + generated OG image; SEO meta on landing + pricing.
- "Auto" theme mode following system preference (third option next to existing manual toggle).

## Phase 3 — Extended features

- CSV bulk import for SaaS from bank/card statements.
- Real migration cost calculator (qualitative inputs).
- Undo/redo on SaaS tool table.
- Additional languages (fr/es/it/ja/ru) if you want them.

---

## Technical notes

- Stack: TanStack Start + React + Tailwind v4 + Lovable Cloud (Supabase under the hood).
- Claude call path: client → `useServerFn(analyzeReviews)` → TanStack server function → Anthropic API. Key never touches the browser.
- Env vars you'll need to know about:
  - `ANTHROPIC_API_KEY` (I'll trigger the secure form after scaffold).
  - Supabase URL/keys are auto-provisioned by Lovable Cloud.
- Codebase stays fully exportable — standard Lovable project, no lock-in.

## Deliverables at end of Phase 1

- Working deployed preview URL.
- README section listing required env vars and where they're set.
- Source browsable/downloadable via the normal Lovable export.

Approve to start Phase 1.
