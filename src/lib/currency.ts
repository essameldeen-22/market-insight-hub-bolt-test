// Multi-currency display with live exchange rates from Frankfurter API.
// USD is the base; rates are cached in localStorage and refreshed every 24h.
// Falls back to last-known cached rates if the live fetch fails.

export type Currency = "USD" | "EUR" | "GBP" | "EGP" | "SAR" | "AED";

export interface CurrencyConfig {
  code: Currency;
  label: string;
  symbol: string;
  fallbackRate: number; // used only if no live rate is available at all
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: "USD", label: "US Dollar", symbol: "$", fallbackRate: 1 },
  { code: "EUR", label: "Euro", symbol: "€", fallbackRate: 0.92 },
  { code: "GBP", label: "British Pound", symbol: "£", fallbackRate: 0.79 },
  { code: "EGP", label: "Egyptian Pound", symbol: "E£", fallbackRate: 48.5 },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼", fallbackRate: 3.75 },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ", fallbackRate: 3.67 },
];

const CACHE_KEY = "mis_currency_rates";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RateCache {
  rates: Record<string, number>;
  date: string; // ISO date string from API
  fetchedAt: number; // epoch ms when we cached this
}

function readCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RateCache;
    if (typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: RateCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — rates remain in-memory only
  }
}

// Build a rate map from the Frankfurter API response.
// Frankfurter returns rates relative to a base (we request USD as base).
function ratesFromResponse(data: { rates?: Record<string, number>; date?: string }): Record<string, number> {
  const rates: Record<string, number> = { USD: 1 };
  if (data.rates) {
    for (const [code, rate] of Object.entries(data.rates)) {
      rates[code] = rate;
    }
  }
  return rates;
}

// Fallback rate map built from the static CURRENCIES config.
function fallbackRates(): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const c of CURRENCIES) rates[c.code] = c.fallbackRate;
  return rates;
}

export interface CurrencyRates {
  rates: Record<string, number>;
  updatedAt: number;
  source: "cache" | "live" | "fallback";
}

// Fetch live rates, using cache if fresh, falling back gracefully.
export async function fetchCurrencyRates(): Promise<CurrencyRates> {
  // 1. Check cache freshness
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { rates: cached.rates, updatedAt: cached.fetchedAt, source: "cache" };
  }

  // 2. Try live fetch
  try {
    const resp = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,EGP,SAR,AED");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as { rates?: Record<string, number>; date?: string };
    const rates = ratesFromResponse(data);
    const newCache: RateCache = { rates, date: data.date ?? new Date().toISOString(), fetchedAt: Date.now() };
    writeCache(newCache);
    return { rates, updatedAt: newCache.fetchedAt, source: "live" };
  } catch {
    // 3. Fall back to stale cache if available, otherwise static rates
    if (cached) {
      return { rates: cached.rates, updatedAt: cached.fetchedAt, source: "cache" };
    }
    return { rates: fallbackRates(), updatedAt: Date.now(), source: "fallback" };
  }
}

// Synchronous initial rates — returns cached or fallback rates immediately
// so the first render doesn't flash wrong numbers.
export function getInitialRates(): CurrencyRates {
  const cached = readCache();
  if (cached) return { rates: cached.rates, updatedAt: cached.fetchedAt, source: "cache" };
  return { rates: fallbackRates(), updatedAt: 0, source: "fallback" };
}

export function formatMoney(usdAmount: number, currency: Currency = "USD", rates?: Record<string, number>): string {
  const cfg = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const rate = rates?.[currency] ?? cfg.fallbackRate;
  const converted = usdAmount * rate;
  const rounded = Math.round(converted);
  const withCommas = new Intl.NumberFormat("en-US", { numberingSystem: "latn", maximumFractionDigits: 0 }).format(rounded);
  return `${cfg.symbol}${withCommas}`;
}
