"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { media, FRAME_COUNT, type MediaDevice } from "@/lib/media";

interface TimelapseCanvasProps {
  /** 0-1 scroll progress, updated by the parent's ScrollTrigger. Read every
   * animation frame rather than passed as a prop, so scrubbing doesn't cause a
   * React re-render per tick. */
  progressRef: MutableRefObject<number>;
  device: MediaDevice;
}

/**
 * Apple-style image-sequence scrub: draws whichever frame the current scroll
 * progress maps to onto a 2D canvas. Frames are fetched on demand and cached as
 * they're first needed (plus a small look-ahead/behind window), rather than
 * preloading all 150 up front - keeps first paint fast on 4G.
 */
export function TimelapseCanvas({ progressRef, device }: TimelapseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const currentIndexRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cache = imagesRef.current;
    cache.clear();
    currentIndexRef.current = -1;

    function loadImage(index: number): HTMLImageElement {
      let img = cache.get(index);
      if (!img) {
        img = new window.Image();
        img.src = media.frame(device, index);
        cache.set(index, img);
      }
      return img;
    }

    function drawFrame(index: number) {
      const img = loadImage(index);
      const render = () => {
        if (!canvas || img.naturalWidth === 0) return;
        const cw = canvas.width;
        const ch = canvas.height;
        const canvasAspect = cw / ch;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let dw: number, dh: number;
        if (imgAspect > canvasAspect) {
          dh = ch;
          dw = dh * imgAspect;
        } else {
          dw = cw;
          dh = dw / imgAspect;
        }
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;
        ctx!.clearRect(0, 0, cw, ch);
        ctx!.drawImage(img, dx, dy, dw, dh);
      };
      if (img.complete && img.naturalWidth > 0) render();
      else img.onload = render;
    }

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(parent.clientWidth * dpr);
      canvas!.height = Math.round(parent.clientHeight * dpr);
      drawFrame(Math.max(1, currentIndexRef.current));
    }
    resize();
    window.addEventListener("resize", resize);

    // Prime the first frame + a short look-ahead immediately.
    for (let i = 1; i <= Math.min(6, FRAME_COUNT); i++) loadImage(i);
    currentIndexRef.current = 1;
    drawFrame(1);

    let raf = requestAnimationFrame(function tick() {
      const t = progressRef.current;
      const index = Math.min(FRAME_COUNT, Math.max(1, Math.round(1 + t * (FRAME_COUNT - 1))));
      if (index !== currentIndexRef.current) {
        currentIndexRef.current = index;
        drawFrame(index);
        for (let d = 1; d <= 4; d++) {
          loadImage(Math.min(FRAME_COUNT, index + d));
          loadImage(Math.max(1, index - d));
        }
      }
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [device, progressRef]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
