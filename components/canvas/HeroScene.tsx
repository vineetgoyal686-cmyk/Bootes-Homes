"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrbitControlsHandle = any;
import { HeroHouse } from "./HeroHouse";
import { computeFraming } from "@/lib/three/frame-camera";
import { media } from "@/lib/media";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface Framing {
  center: THREE.Vector3;
  distance: number;
  radius: number;
  groundY: number;
  spread: number;
}

/** Cinematic hero scene: soft warm lighting, sunset environment, contact shadows,
 * and a slow ambient orbit around the house. Camera framing is computed at
 * runtime from the loaded model's bounding box (see HeroHouse's onReady), and
 * re-computed whenever the canvas's aspect ratio changes (window resize, or
 * the hero switching between its stacked-mobile and split-desktop layouts) so
 * the house is never cropped in a narrower column. */
export function HeroScene() {
  const controlsRef = useRef<OrbitControlsHandle>(null);
  const boxRef = useRef<THREE.Box3 | null>(null);
  const [framing, setFraming] = useState<Framing | null>(null);
  const { size } = useThree();
  const reducedMotion = useReducedMotion();

  const recompute = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;

    const aspect = size.width / size.height;
    // The fit is sphere-based, which already leaves slack around a box-shaped
    // house at any orbit angle - so only a small extra margin is needed for
    // the house to fill its column instead of reading as small/lost.
    const f = computeFraming(box, 32, 1.02, aspect);
    const boxSize = box.getSize(new THREE.Vector3());
    const next: Framing = {
      center: f.center,
      distance: f.distance,
      radius: f.radius,
      groundY: box.min.y,
      spread: Math.max(boxSize.x, boxSize.z),
    };
    setFraming(next);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(next.center);
      controls.object.position.set(
        next.center.x + next.distance * 0.55,
        next.center.y + next.distance * 0.32,
        next.center.z + next.distance * 0.75
      );
      controls.update();
    }
  }, [size.width, size.height]);

  const handleReady = useCallback(
    (box: THREE.Box3) => {
      boxRef.current = box.clone();
      recompute();
    },
    [recompute]
  );

  // Re-frame whenever the canvas resizes (recompute's identity changes with
  // size.width/height - see above).
  useEffect(() => {
    recompute();
  }, [recompute]);

  return (
    <>
      {/* Key light does most of the work (strong, directional, shadowed) so
          faces read with clear light/shade contrast; fill + IBL stay moderate
          so ACES doesn't roll highlights off into a pale, washed-out look. */}
      <ambientLight intensity={0.12} />
      <hemisphereLight args={["#fff4e6", "#3a3530", 0.45]} />
      <directionalLight
        color="#ffe2c4"
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        position={
          framing
            ? [
                framing.center.x + framing.distance * 0.6,
                framing.center.y + framing.distance * 0.9,
                framing.center.z + framing.distance * 0.25,
              ]
            : [10, 15, 6]
        }
      />

      <Suspense fallback={null}>
        <HeroHouse onReady={handleReady} />
        <Environment files={media.environmentHdri()} environmentIntensity={0.75} />
        {/* No ContactShadows: the model sits on its own thick site slab, so a
            blurred ground shadow under the slab only showed up as a dark
            smudge poking out beside it, not as grounding. */}
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        // Reduced motion: keep the model, just don't spin it on its own.
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.15}
      />
    </>
  );
}
