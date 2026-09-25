"use client";

import { useEffect, useRef, useState } from "react";
import { media } from "@/lib/media";

interface TimelapseModalProps {
  open: boolean;
  onClose: () => void;
}

/** Full-video HLS player, hls.js for Chrome/Firefox/Edge, native <video> HLS
 * playback for Safari/iOS (which doesn't support the MediaSource path hls.js
 * needs anyway). */
export function TimelapseModal({ open, onClose }: TimelapseModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;

    setError(null);
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm sm:p-8"
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
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            poster={media.posters.start()}
            className="aspect-video w-full rounded-xl bg-black shadow-2xl"
          >
            Your browser does not support video playback.
          </video>
        )}
      </div>
    </div>
  );
}
