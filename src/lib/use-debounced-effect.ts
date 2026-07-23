import { useEffect } from "react";

// Debounced effect helper — runs `effect` after `delay` ms of no dependency changes.
export function useDebouncedEffect(effect: () => void, deps: unknown[], delay = 600): void {
  useEffect(() => {
    const id = setTimeout(effect, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
