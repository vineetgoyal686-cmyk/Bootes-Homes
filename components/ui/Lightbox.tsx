"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export interface LightboxImage {
  src: string;
  alt: string;
  /** Shown under the photo, e.g. "Demolition · 1 Feb 2025". */
  caption?: string;
  /** URL the page already has loaded for this photo (the clicked thumbnail),
   * shown instantly while the full-size version loads. */
  preview?: string;
}

interface LightboxProps {
  /** The photo to show, or null when closed. */
  image: LightboxImage | null;
  onClose: () => void;
}

/**
 * Full-screen view of a single photo, whole and uncropped. Opens instantly
 * on the already-loaded thumbnail and cross-fades to the full-size photo.
 * Esc, the close button or a click anywhere outside the photo closes it.
 */
export function Lightbox({ image, onClose }: LightboxProps) {
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      data-lenis-prevent
      onClick={onClose}
      className="fixed inset-0 z-[300] flex animate-[player-fade_250ms_ease-out] flex-col bg-black/95 backdrop-blur-md"
    >
      <div className="flex justify-end px-4 py-3 sm:px-8 sm:py-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z" />
          </svg>
        </button>
      </div>

      <div className="relative min-h-0 flex-1 animate-[photo-zoom_400ms_cubic-bezier(0.22,1,0.36,1)] px-2 sm:px-16">
        {image.preview && (
          // eslint-disable-next-line @next/next/no-img-element -- already-cached thumbnail URL, shown as-is
          <img
            src={image.preview}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="100vw"
          onClick={(e) => e.stopPropagation()}
          onLoad={() => setLoaded(image.src)}
          className={`object-contain transition-opacity duration-300 ${loaded === image.src ? "opacity-100" : "opacity-0"}`}
        />
        {loaded !== image.src && !image.preview && (
          <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        )}
      </div>

      <p className="px-4 py-4 text-center font-sans text-sm text-white/80 sm:py-6 sm:text-base">
        {image.caption}
      </p>
    </div>
  );
}
