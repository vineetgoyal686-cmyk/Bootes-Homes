"use client";

import { useEffect, useRef, useState } from "react";
import { media } from "@/lib/media";

interface TimelapseModalProps {
  open: boolean;
  onClose: () => void;
}

const SPEEDS = [0.5, 1, 1.5, 2, 4, 8];
/** Wheel distance (px) per speed step - trackpads fire many small events, so
 * deltas are accumulated rather than stepping once per event. */
const WHEEL_STEP = 80;

const label = (s: number) => `${s}×`;

/** Full-video HLS player, hls.js for Chrome/Firefox/Edge, native <video> HLS
 * playback for Safari/iOS (which doesn't support the MediaSource path hls.js
 * needs anyway). Scrolling over the video changes the playback speed; the
 * speed buttons below do the same on touch devices. */
export function TimelapseModal({ open, onClose }: TimelapseModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  // Bumped on every change so the on-video speed badge re-flashes.
  const [flash, setFlash] = useState(0);

  const applySpeed = (next: number) => {
    setSpeed(next);
    setFlash((n) => n + 1);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setSpeed(1);
    let hls: import("hls.js").default | null = null;
    let cancelled = false;

    async function setup() {
      const src = media.hlsMaster();
      if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        video!.src = src;
        return;
      }
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video!);
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) setError("Couldn't load the video. Please check your connection and try again.");
        });
      } else {
        setError("Video playback isn't supported in this browser.");
      }
    }
    setup();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [open]);

  // Wheel over the video = speed up / slow down. Needs a non-passive listener
  // so the page behind the modal doesn't scroll instead.
  useEffect(() => {
    if (!open) return;
    const el = frameRef.current;
    if (!el) return;
    let acc = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < WHEEL_STEP) return;
      const dir = acc < 0 ? 1 : -1; // scroll up = faster
      acc = 0;
      const video = videoRef.current;
      const current = video?.playbackRate ?? 1;
      const idx = SPEEDS.indexOf(current);
      const nextIdx = Math.min(SPEEDS.length - 1, Math.max(0, (idx === -1 ? 1 : idx) + dir));
      applySpeed(SPEEDS[nextIdx]);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full construction timelapse"
      // Keep Lenis (smooth scroll) from scrolling the page behind the modal -
      // body overflow:hidden alone doesn't stop it.
      data-lenis-prevent
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-11 right-0 rounded-full bg-background-elevated px-4 py-2 font-sans text-sm text-foreground shadow-sm"
        >
          Close ✕
        </button>

        {error ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-background-elevated p-8 text-center">
            <p className="font-sans text-foreground-muted">{error}</p>
          </div>
        ) : (
          <>
            <div ref={frameRef} className="relative">
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                poster={media.posters.start()}
                // Loading a new source resets the rate; keep the chosen one.
                onLoadedMetadata={(e) => (e.currentTarget.playbackRate = speed)}
                className="aspect-video w-full rounded-xl bg-black shadow-2xl"
              >
                Your browser does not support video playback.
              </video>
              <span
                key={flash}
                aria-live="polite"
                className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 font-sans text-sm font-medium text-white backdrop-blur-sm animate-[speed-flash_1.2s_ease-out]"
              >
                {label(speed)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Playback speed" className="flex flex-wrap gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applySpeed(s)}
                    aria-pressed={speed === s}
                    className={`rounded-full px-3.5 py-1.5 font-sans text-sm transition-colors ${
                      speed === s
                        ? "bg-white text-foreground"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {label(s)}
                  </button>
                ))}
              </div>
              <p className="hidden font-sans text-xs text-white/60 sm:block">
                Scroll on the video to speed up or slow down
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
