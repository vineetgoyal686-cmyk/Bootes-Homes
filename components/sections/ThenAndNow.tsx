"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import { formatDate } from "@/lib/format";
import { media } from "@/lib/media";
import type { JourneyStage } from "@/data/projects";

const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/**
 * Drag-to-compare of the first and last journey photos (both street views).
 * On first sight the divider sweeps across once to show it can be moved.
 */
export function ThenAndNow({ before, after }: { before: JourneyStage; after: JourneyStage }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);

  // One-time sweep when the slider first comes into view.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || hinted) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setHinted(true);
        const frames = [50, 30, 70, 50];
        frames.forEach((p, i) => setTimeout(() => setPos(p), 350 + i * 550));
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hinted]);

  const moveTo = (clientX: number) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    moveTo(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => dragging && moveTo(e.clientX);
  const onUp = () => setDragging(false);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
    else return;
    e.preventDefault();
  };

  const b = before.images[0];
  const a = after.images[0];

  return (
    <section className="relative px-6 pb-28 pt-12 sm:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.35em] text-accent-cyan">Then &amp; now</p>
          <h2 className="mt-5 font-display text-4xl leading-[1.05] sm:text-6xl">
            Same plot.
            <br />
            <span className="italic text-white/60">A new chapter.</span>
          </h2>
          <p className="mt-6 max-w-sm font-sans text-white/60">
            Drag across the photo to see the house as it stood in {monthYear(before.date)}, and the home
            standing there today.
          </p>
          <div className="mt-8 flex gap-8 font-sans">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Then</p>
              <p className="mt-1 font-display text-2xl">{formatDate(before.date)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Now</p>
              <p className="mt-1 font-display text-2xl">{formatDate(after.date)}</p>
            </div>
          </div>
        </div>

        <div
          ref={frameRef}
          role="slider"
          tabIndex={0}
          aria-label="Compare the old house with the new home"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
          className="relative mx-auto aspect-[4/5] w-full max-w-[520px] cursor-ew-resize touch-none select-none overflow-hidden rounded-3xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
        >
          {/* Now (underneath) */}
          <Image src={media.journey(a.name)} alt={`${after.label}: the new home`} fill sizes="520px" className="object-cover object-top" />
          {/* Then (clipped to the left of the divider) */}
          <div
            className={`absolute inset-0 ${dragging ? "" : "transition-[clip-path] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"}`}
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <Image src={media.journey(b.name)} alt={`${before.label}: the original house`} fill sizes="520px" className="object-cover object-top" />
          </div>

          <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.25em] backdrop-blur-md">
            {monthYear(before.date)}
          </span>
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.25em] backdrop-blur-md">
            {monthYear(after.date)}
          </span>

          {/* Divider + handle */}
          <div
            className={`pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_20px_rgba(0,0,0,0.5)] ${
              dragging ? "" : "transition-[left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            }`}
            style={{ left: `${pos}%` }}
          >
            <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-xl">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M9 6 3 12l6 6V6zm6 0v12l6-6-6-6z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
