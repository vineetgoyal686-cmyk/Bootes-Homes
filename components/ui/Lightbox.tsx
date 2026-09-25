"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";

export interface LightboxImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Shown under the photo, e.g. "Demolition · 1 Feb 2025". */
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  /** Index to show, or null when closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

/** Swipe distance (px) that counts as next/previous on touch screens. */
const SWIPE = 50;

/**
 * Full-screen photo viewer: the whole photo, uncropped, with previous/next
 * (buttons, arrow keys or swipe), a counter and caption. Esc or a click on
 * the backdrop closes it.
 */
export function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const open = index !== null;
  const count = images.length;
  const [loaded, setLoaded] = useState<string | null>(null);
  const swipe = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (index === null) return;
      onIndexChange((index + dir + count) % count);
    },
    [index, count, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, go]);

  if (index === null) return null;
  const img = images[index];

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") swipe.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (start === null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
  };

  const arrow =
    "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25 sm:flex";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      data-lenis-prevent
      onClick={onClose}
      onPointerDown={onDown}
      onPointerUp={onUp}
      className="fixed inset-0 z-[300] flex animate-[player-fade_250ms_ease-out] touch-none flex-col bg-black/95 backdrop-blur-md"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white sm:px-8 sm:py-5">
        <span className="font-sans text-sm tabular-nums text-white/60">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/25"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z" />
          </svg>
        </button>
      </div>

      {/* Photo */}
      <div className="relative min-h-0 flex-1 px-2 sm:px-24">
        {count > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous photo"
            className={`${arrow} left-4 sm:left-8`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z" />
            </svg>
          </button>
        )}
        <div className="relative h-full w-full">
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            sizes="100vw"
            onClick={(e) => e.stopPropagation()}
            onLoad={() => setLoaded(img.src)}
            className={`object-contain transition-opacity duration-300 ${loaded === img.src ? "opacity-100" : "opacity-0"}`}
          />
          {loaded !== img.src && (
            <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          )}
        </div>
        {count > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next photo"
            className={`${arrow} right-4 sm:right-8`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="m8.6 5.4 1.4-1.4 8 8-8 8-1.4-1.4 6.6-6.6z" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="px-4 py-4 text-center sm:py-6">
        {img.caption && <p className="font-sans text-sm text-white/80 sm:text-base">{img.caption}</p>}
        {count > 1 && <p className="mt-1 font-sans text-xs text-white/40 sm:hidden">Swipe for more</p>}
      </div>
    </div>
  );
}
