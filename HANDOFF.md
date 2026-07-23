# Market Intelligence Suite — Handoff Guide

## Overview

A production-ready React + TanStack Start + Supabase application with four modules for market intelligence and cost optimization. The app supports Arabic (RTL) and English with full i18n.

## The Four Modules

1. **Competitor Analysis** — Paste competitor product reviews (or load demo data), and Claude AI analyzes sentiment distribution, recurring topics, pain points (with actionable differentiation opportunities), and strengths (with competitive benchmarking advice). Supports multi-product comparison and sentiment trend tracking over time.

2. **SaaS Audit** — Inventory your paid SaaS tools and see annual spend, potential savings via open-source alternatives, waste from underused licenses, and a full migration cost calculator (labor + training + risk buffer). Users can submit new tool/alternative suggestions for admin review.

3. **Pricing Calculator** — Calculate optimal pricing based on cost, customer count, competitor pricing, and target margin. Includes break-even analysis, competitor comparison, and financial projections.

4. **ROI Calculator** — Compute return on investment for any decision (tech stack change, new tool, etc.) with cumulative cost/gain charting and break-even month detection.

## Third-Party Services

| Service | Purpose | Where Keys Live |
|---------|---------|-----------------|
| **Supabase** | Database, authentication, row-level security, edge functions | Pre-configured in `.env` (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) |
| **Anthropic Claude API** | Sentiment/topic analysis of competitor reviews | `ANTHROPIC_API_KEY` in `.env` and/or Supabase edge function secrets |
| **Frankfurter API** | Live currency exchange rates (no key needed) | No key required — free public API at frankfurter.app |
| **Stripe** | Payment processing for Pro plan (NOT YET ACTIVE) | See "Activating Stripe" below |

## What's Fully Working

- All four modules with full functionality
- User authentication (email/password via Supabase)
- Data persistence per user (SaaS stacks, pricing states, ROI states, competitor analyses)
- Live currency conversion with 24h cache and fallback rates
- Arabic/English i18n with RTL support
- Terms of Service and Privacy Policy pages
- PDF export for competitor analysis, pricing, and ROI reports
- Undo/redo history in SaaS Audit (with no-op detection)
- Multi-competitor sentiment trend tracking over time
- Crowd-sourced SaaS alternative suggestions (with admin review workflow)
- Automated tests for all calculation logic (20 tests, all passing)
- Unified navigation bar across all pages

## What's Intentionally Left as a Placeholder

### Stripe Payments (Pro Plan)

The checkout UI is fully built on the `/pricing` page — the "Upgrade to Pro" button is wired and shows a clear message when Stripe isn't configured. Two edge function placeholders exist with detailed activation instructions:

- `supabase/functions/stripe-checkout/index.ts` — creates Stripe Checkout Sessions
- `supabase/functions/stripe-webhook/index.ts` — handles webhook events to activate/deactivate Pro

**To activate real payments:**

1. Create a Stripe account at https://dashboard.stripe.com/register
2. Get your Stripe secret key from Developers > API Keys
3. Add the secret key as a Supabase secret named `STRIPE_SECRET_KEY` (Supabase dashboard > Project Settings > Edge Functions > Secrets)
4. Create a recurring Price in Stripe for the Pro plan ($29/month) and note the price ID
5. Update `PRO_PRICE_ID` in `supabase/functions/stripe-checkout/index.ts` with your real price ID
6. Deploy both edge functions using the Supabase MCP `deploy_edge_function` tool
7. In your Stripe dashboard, go to Developers > Webhooks > Add endpoint:
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET`
8. Uncomment the real logic in both edge function files and redeploy

The database schema is already in place:
- `profiles.is_pro` boolean flag (the UI checks this)
- `pro_subscriptions` table for tracking Stripe customer/subscription IDs

### Team Mode (Groundwork Only)

The `/pricing` page shows a "Team" plan as "Coming Soon." The database schema exists (`teams` and `team_members` tables with RLS policies) but no team UI is built. A future owner can build sharing/collaboration UI on top of this schema.

### Crowd-Sourced Alternatives (Admin Review)

Users can submit tool/alternative suggestions from the SaaS Audit module. Submissions go to a `pending_suggestions` table. An admin must manually approve them into the `saas_alternatives` table.

**To set up admin access:**

1. Sign up and confirm your account
2. Get your user ID from the Supabase dashboard (auth.users table)
3. Set the admin user ID in the database:
   ```sql
   ALTER DATABASE current_database() SET app.admin_user_id = 'your-uuid-here';
   ```
4. Admin functions (approve/reject suggestions) are available via server functions in `src/lib/suggestion.functions.ts`

## Running Locally

```bash
npm install
npm run dev
```

The dev server starts automatically. Open the URL shown in the terminal.

## Building and Deploying

```bash
npm run build        # Production build
npm run preview      # Preview the production build locally
```

The project uses Lovable's vite-tanstack-config for deployment. The build output is in `.output/`.

## Running Tests

```bash
npx tsx --test src/lib/calculations.test.ts
```

20 tests covering pricing, ROI, SaaS savings, migration cost, and sentiment scoring.

## Project Structure

```
src/
  components/
    DashboardApp.tsx          # Main dashboard shell
    NavBar.tsx                # Unified navigation (all pages)
    Footer.tsx                # Footer with Terms/Privacy links
    modules/
      Card.tsx                # Shared card wrapper
      CompetitorAnalysis.tsx  # Module 1: AI review analysis
      SaasAudit.tsx           # Module 2: SaaS cost audit
      PricingCalculator.tsx   # Module 3: Pricing strategy
      RoiCalculator.tsx       # Module 4: ROI projection
      SuggestionBox.tsx       # Crowdsourced alternative submission
  lib/
    claude.server.ts          # Claude API integration + prompt
    currency.ts               # Live Frankfurter rates + formatting
    calculations.ts           # Pure calculation functions (tested)
    calculations.test.ts      # Automated tests
    saas-alts.ts              # Static alternatives database
    suggestion.functions.ts   # Suggestion submit/admin server functions
    persistence.functions.ts  # Load/save user data
    trend.functions.ts        # Analysis history for trend tracking
    pdf-export.ts             # PDF export utility
    csv-parser.ts             # CSV import for SaaS tools
    use-debounced-effect.ts   # Debounced save hook
  routes/
    index.tsx                 # Landing page
    value.tsx                 # "Why" marketing page
    pricing.tsx               # Pricing page with checkout UI
    about.tsx                 # About page
    auth.tsx                  # Sign in / Sign up
    terms.tsx                 # Terms of Service
    privacy.tsx               # Privacy Policy
    _authenticated/
      route.tsx               # Auth guard layout
      app.tsx                 # Dashboard route entry
  i18n/
    dictionaries.ts           # Arabic + English translations
    context.tsx               # i18n provider
  integrations/
    supabase/                 # Supabase client + auth middleware
supabase/
  functions/
    stripe-checkout/          # Placeholder: Stripe checkout session creation
    stripe-webhook/            # Placeholder: Stripe webhook handler
```

## Database Schema

All tables use Supabase Row Level Security (RLS) with `auth.uid()` ownership checks.

- `profiles` — user profile + `is_pro` flag
- `saas_stacks` — per-user SaaS tool inventory
- `pricing_states` — per-user pricing calculator state
- `roi_states` — per-user ROI calculator state
- `competitor_analyses` — saved analysis results (for trend tracking)
- `pending_suggestions` — crowd-sourced alternative submissions (admin review)
- `saas_alternatives` — approved alternatives (supplements static list)
- `pro_subscriptions` — Stripe subscription tracking
- `teams` — team entities (groundwork, no UI yet)
- `team_members` — team membership with roles (groundwork, no UI yet)

## Important Notes for the New Owner

- **No review scraping**: The app does NOT scrape reviews from Amazon, Google Play, Trustpilot, or any platform. Users paste reviews manually. This is by design and should not be changed.
- **Claude API costs**: Each competitor analysis call uses the Anthropic Claude API. Monitor usage and set billing limits in your Anthropic dashboard.
- **Currency rates**: The Frankfurter API is free and needs no key. Rates are cached for 24 hours in the browser.
- **Admin setup**: After deploying, set the admin user ID (see "Crowd-Sourced Alternatives" above) to review and approve suggestion submissions.
