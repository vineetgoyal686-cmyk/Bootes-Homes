"use client";

import { useEffect, useState } from "react";
import { useHouseLoader } from "@/lib/store/house-loader";
import { Logo } from "@/components/ui/Logo";

const MIN_DISPLAY_MS = 900;
// If the model genuinely fails or stalls, don't trap the visitor behind a
// loading screen forever - let them into the (degraded) page.
const FAILSAFE_MS = 8000;

export function LoadingScreen() {
  const progress = useHouseLoader((s) => s.progress);
  const loaded = useHouseLoader((s) => s.loaded);
  const error = useHouseLoader((s) => s.error);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [failsafeElapsed, setFailsafeElapsed] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    const t2 = setTimeout(() => setFailsafeElapsed(true), FAILSAFE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    // Loading screen is fixed + covers the viewport, so stop background scroll
    // while it's up.
    if (removed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [removed]);

  const ready = ((loaded || Boolean(error)) && minTimeElapsed) || failsafeElapsed;

  if (removed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ready ? "Loading complete" : `Loading ${Math.round(progress)}%`}
      aria-hidden={ready}
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity" && ready) setRemoved(true);
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background transition-opacity duration-700 ease-out ${
        ready ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Logo variant="mark" height={56} priority />

      <div className="flex w-48 flex-col items-center gap-3">
        <div className="h-px w-full overflow-hidden bg-border">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="font-sans text-xs tabular-nums tracking-widest text-foreground-muted">
          {error ? "Continuing without preview" : `${Math.round(Math.min(100, progress))}%`}
        </span>
      </div>
    </div>
  );
}
