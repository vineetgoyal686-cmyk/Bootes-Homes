"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `target` once the returned ref's element enters the
 * viewport. Runs once per mount (re-triggering on every scroll into view would
 * be distracting on a stats section people scroll past more than once). */
export function useCountUp<T extends HTMLElement>(target: number, durationMs = 1400) {
  const ref = useRef<T>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;

        const start = performance.now();
        function tick(now: number) {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}
