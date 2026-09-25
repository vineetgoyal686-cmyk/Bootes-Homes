"use client";

import { useEffect } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { media } from "@/lib/media";
import { useHouseLoader } from "@/lib/store/house-loader";

/**
 * Renders nothing - just kicks off the house.glb load once, on mount, and streams
 * real byte progress (from the loader's XHR onProgress) into the shared store.
 * Deliberately not using drei's useGLTF/Suspense here: that only reports coarse
 * "items loaded" counts (0 or 1 for a single file), not real byte progress, which
 * the loading screen needs.
 */
export function ModelLoader() {
  const setProgress = useHouseLoader((s) => s.setProgress);
  const setLoaded = useHouseLoader((s) => s.setLoaded);
  const setError = useHouseLoader((s) => s.setError);

  useEffect(() => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(media.dracoDecoderPath());

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    let cancelled = false;

    loader.load(
      media.houseModel(),
      (gltf) => {
        if (!cancelled) setLoaded(gltf);
      },
      (event) => {
        if (cancelled) return;
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 100);
        }
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load model");
      }
    );

    return () => {
      cancelled = true;
      dracoLoader.dispose();
    };
  }, [setProgress, setLoaded, setError]);

  return null;
}
