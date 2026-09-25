"use client";

import { useMediaQuery } from "./use-media-query";

/** True if the user has requested reduced motion at the OS/browser level. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
