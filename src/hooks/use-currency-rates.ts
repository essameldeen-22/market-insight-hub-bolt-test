import { useCallback, useEffect, useState } from "react";
import { fetchCurrencyRates, getInitialRates, type CurrencyRates } from "@/lib/currency";

// Hook that loads live exchange rates on mount and exposes them + a timestamp.
// Returns cached/fallback rates synchronously on first render, then updates
// when the live fetch resolves.
export function useCurrencyRates(): {
  rates: Record<string, number>;
  updatedAt: number;
  source: CurrencyRates["source"];
  refresh: () => void;
} {
  const [state, setState] = useState<CurrencyRates>(() => getInitialRates());

  const load = useCallback(async () => {
    const result = await fetchCurrencyRates();
    setState(result);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rates: state.rates,
    updatedAt: state.updatedAt,
    source: state.source,
    refresh: load,
  };
}
