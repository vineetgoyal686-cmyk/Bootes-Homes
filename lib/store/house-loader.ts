import { create } from "zustand";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

interface HouseLoaderState {
  progress: number; // 0-100, real bytes-loaded/total from the GLTFLoader XHR
  loaded: boolean;
  error: string | null;
  gltf: GLTF | null;
  setProgress: (p: number) => void;
  setLoaded: (gltf: GLTF) => void;
  setError: (message: string) => void;
}

/**
 * Holds the single shared GLTF load. Loading happens once (see
 * components/providers/ModelLoader.tsx), outside of React Suspense, so we get
 * real byte-level progress from the loader's XHR onProgress callback and so every
 * 3D section can reuse the same parsed scene instead of re-fetching it.
 */
export const useHouseLoader = create<HouseLoaderState>((set) => ({
  progress: 0,
  loaded: false,
  error: null,
  gltf: null,
  setProgress: (p) => set({ progress: p }),
  setLoaded: (gltf) => set({ gltf, loaded: true, progress: 100 }),
  setError: (message) => set({ error: message }),
}));
