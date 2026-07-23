// Multi-currency display. USD is the base; other rates are fixed defaults
// (approx market rates as of the build). This is a display helper only —
// no calculation logic uses these rates internally.

export type Currency = "USD" | "EGP" | "SAR" | "AED";

export const CURRENCIES: { code: Currency; label: string; symbol: string; rate: number }[] = [
  { code: "USD", label: "US Dollar", symbol: "$", rate: 1 },
  { code: "EGP", label: "Egyptian Pound", symbol: "E£", rate: 48.5 },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼", rate: 3.75 },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ", rate: 3.67 },
];

export function formatMoney(usdAmount: number, currency: Currency = "USD"): string {
  const cfg = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const converted = usdAmount * cfg.rate;
  const rounded = Math.round(converted);
  const withCommas = new Intl.NumberFormat("en-US", { numberingSystem: "latn", maximumFractionDigits: 0 }).format(rounded);
  return `${cfg.symbol}${withCommas}`;
}
