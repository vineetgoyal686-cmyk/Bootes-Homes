"use client";

import { useDeviceTier } from "./use-device-tier";

/**
 * Signal used by every heavy 3D section to decide between the full 3D
 * experience and the lighter fallback (static photo + simple fades) - only for
 * genuinely weak devices. Reduced motion is NOT a reason to drop the 3D (that
 * setting asks for less motion, not no model); sections handle it themselves,
 * e.g. the hero stops auto-rotating.
 */
export function useLightExperience(): boolean {
  return useDeviceTier() === "low";
}
