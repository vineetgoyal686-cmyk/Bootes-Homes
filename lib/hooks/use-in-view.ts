"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is near the viewport, so heavy 3D <Canvas>
 * instances can be unmounted (stop rendering every frame) while scrolled far
 * away instead of all running simultaneously. Defaults to `true` so the first
 * paint isn't empty before the observer attaches.
 */
export function useInView<T extends HTMLElement>(rootMargin = "400px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
