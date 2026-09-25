import * as THREE from "three";

export interface Framing {
  center: THREE.Vector3;
  distance: number;
  radius: number;
}

/**
 * Computes a camera distance that fits a bounding box in frame for a given
 * vertical FOV, without cropping even in a narrow/portrait viewport. The
 * model's real-world scale/units are whatever the Revit export used, so
 * cameras are always framed from this at runtime rather than hard-coded
 * positions.
 *
 * `aspect` (canvas width/height) matters because the fit is sphere-based
 * (angle-invariant) - if the canvas is narrower than tall, the horizontal FOV
 * is the tighter constraint and the naive vertical-FOV-only distance would
 * crop the sides. Pass the real canvas aspect for anything that isn't a wide
 * full-bleed canvas (e.g. a hero split into a text column + a narrower model
 * column).
 */
export function computeFraming(
  box: THREE.Box3,
  fovDegrees: number,
  margin = 1.35,
  aspect = 16 / 9
): Framing {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.001);
  const verticalFov = THREE.MathUtils.degToRad(fovDegrees);
  const verticalHalfAngle = verticalFov / 2;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
  const limitingHalfAngle = Math.min(verticalHalfAngle, horizontalHalfAngle);
  const distance = (radius * margin) / Math.sin(limitingHalfAngle);
  return { center, distance, radius };
}
