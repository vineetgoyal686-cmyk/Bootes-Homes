"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a media query via useSyncExternalStore rather than
 * useState+useEffect, so there's no "setState synchronously in an effect"
 * cascade and the value is safe to read during render (SSR snapshot is `false`,
 * corrected on the client's first paint).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
