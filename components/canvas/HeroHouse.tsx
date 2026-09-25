"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useHouseLoader } from "@/lib/store/house-loader";
import { cloneSceneWithMaterials, tagGlassMeshes, applyGlassTint } from "@/lib/three/model-utils";

interface HeroHouseProps {
  /** Called once, the first time the cloned scene's world bounding box is known,
   * so the parent can frame the camera around it. */
  onReady?: (box: THREE.Box3) => void;
}

export function HeroHouse({ onReady }: HeroHouseProps) {
  const gltf = useHouseLoader((s) => s.gltf);

  const scene = useMemo(() => {
    if (!gltf) return null;
    const cloned = cloneSceneWithMaterials(gltf.scene);
    const glassMeshes = tagGlassMeshes(cloned);
    for (const mesh of glassMeshes) applyGlassTint(mesh);
    return cloned;
  }, [gltf]);

  useEffect(() => {
    if (!scene || !onReady) return;
    scene.updateMatrixWorld(true);
    onReady(new THREE.Box3().setFromObject(scene));
    // Intentionally runs only when `scene` changes - onReady is a stable framing
    // callback the parent doesn't want re-invoked on its own re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  if (!scene) return null;
  return <primitive object={scene} />;
}
