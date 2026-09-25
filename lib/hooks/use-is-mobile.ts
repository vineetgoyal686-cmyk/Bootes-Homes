"use client";

import { useMediaQuery } from "./use-media-query";

/** Viewport-based (not performance-based) mobile check, used to cap canvas DPR. */
export function useIsMobile(breakpointPx = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpointPx - 1}px)`);
}
