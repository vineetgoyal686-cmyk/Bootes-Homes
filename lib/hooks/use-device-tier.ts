"use client";

import { useSyncExternalStore } from "react";

export type DeviceTier = "high" | "low";

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
}

function getTier(): DeviceTier {
  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;

  // `deviceMemory`/`hardwareConcurrency` were previously gated at <=4, which
  // sounds conservative but isn't: browsers deliberately round/cap these
  // (deviceMemory maxes out at 8 regardless of real RAM, and is rounded down
  // to the nearest power of two), so plenty of genuinely capable machines
  // report exactly 4 and were being wrongly downgraded to the static-image
  // fallback. <=2 only catches devices with real evidence of being weak.
  //
  // Network hints (saveData / effectiveType) are deliberately NOT used: the
  // house model downloads on every model route regardless (ModelLoader), so
  // skipping the 3D saves no data - and effectiveType misreports "3g" on
  // perfectly good connections (VPNs, momentary latency), which was dropping
  // capable desktops to the static fallback.
  return cores <= 2 || memory <= 2 ? "low" : "high";
}

/**
 * Coarse, best-effort heuristic for whether this device can handle the
 * full 3D experience (Environment IBL, autorotate, high pixel ratio) or should get
 * the lighter fallback (static renders, simple fades - see useLightExperience).
 * Every signal here is optional/inconsistent across browsers, so this only ever
 * downgrades on positive evidence of a constrained device; it defaults to "high".
 */
export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(
    // Core count / memory don't change during a session.
    () => () => {},
    getTier,
    () => "high" as const
  );
}
