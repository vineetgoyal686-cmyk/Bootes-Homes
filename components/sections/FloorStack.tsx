"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { FloorArea } from "@/data/projects";

const SQFT_PER_SQM = 10.7639;
/** px per metre of footprint. */
const SCALE = 13;
/** Slab thickness, px. */
const THICKNESS = 14;
/** Extra space between slabs once the stack "explodes", px. */
const GAP_OPEN = 58;
/** The model's floor plates are 10 m wide; smaller levels (the mumty) get a
 * squarer footprint so they don't read as a thin strip. */
const PLATE_WIDTH_M = 10;

const mix = (pct: number, base = "var(--background-elevated)") =>
  `color-mix(in srgb, var(--accent) ${pct}%, ${base})`;

function footprint(sqft: number) {
  const sqm = sqft / SQFT_PER_SQM;
  const w = Math.min(PLATE_WIDTH_M, Math.sqrt(sqm) * 0.75);
  return { w: w * SCALE, d: (sqm / w) * SCALE };
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

/**
 * Floor-wise built-up area as an exploded isometric stack of slabs (pure CSS
 * 3D - no WebGL canvas), sized to each level's real area, synced with a list
 * on the side. Collapsed into a "building" until scrolled into view, then the
 * levels separate; hovering either a slab or a row lifts and highlights it.
 */
export function FloorStack({ floors, total }: { floors: FloorArea[]; total: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOpen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxSqft = Math.max(...floors.map((f) => f.sqft));
  // List reads top-down like the building itself (highest level first).
  const listOrder = floors.map((f, i) => ({ ...f, i })).reverse();

  return (
    <div
      ref={rootRef}
      className="mx-auto mt-20 grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16"
    >
      {/* 3D stack */}
      <div className="relative -my-6 h-[400px] origin-center scale-[0.72] sm:my-0 sm:h-[500px] sm:scale-100" style={{ perspective: "1800px" }}>
        <div
          className="absolute left-1/2 top-[64%]"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(58deg) rotateZ(-42deg)" }}
        >
          {floors.map((f, i) => {
            const { w, d } = footprint(f.sqft);
            const isActive = active === i;
            const dim = active !== null && !isActive;
            const z = i * (THICKNESS + (open ? GAP_OPEN : 0)) + (isActive ? 16 : 0);
            const top = isActive ? mix(88, "var(--accent-cyan)") : mix(10);
            const sideA = isActive ? mix(95, "#000") : mix(34);
            const sideB = isActive ? mix(80, "#000") : mix(50);
            const face: CSSProperties = { position: "absolute", backfaceVisibility: "visible" };

            return (
              <div
                key={f.label}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive((cur) => (cur === i ? null : i))}
                className="absolute cursor-pointer"
                style={{
                  width: w,
                  height: d,
                  left: -w / 2,
                  top: -d / 2,
                  transformStyle: "preserve-3d",
                  transform: `translateZ(${z}px)`,
                  transition: `transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ${open && active === null ? i * 90 : 0}ms, opacity 300ms`,
                  opacity: dim ? 0.45 : 1,
                }}
              >
                {/* top */}
                <div
                  style={{
                    ...face,
                    inset: 0,
                    transform: `translateZ(${THICKNESS}px)`,
                    backgroundColor: top,
                    // 1 m grid, like a floor plan.
                    backgroundImage: isActive
                      ? undefined
                      : `linear-gradient(${mix(22)} 1px, transparent 1px), linear-gradient(90deg, ${mix(22)} 1px, transparent 1px)`,
                    backgroundSize: `${SCALE}px ${SCALE}px`,
                    outline: `1px solid ${mix(45)}`,
                    boxShadow: isActive ? "0 0 40px rgba(56,198,244,0.55)" : undefined,
                    transition: "background-color 300ms",
                  }}
                />
                {/* long sides (y = 0 and y = d) */}
                {[0, d].map((y) => (
                  <div
                    key={`y${y}`}
                    style={{
                      ...face,
                      left: 0,
                      top: y,
                      width: w,
                      height: THICKNESS,
                      transformOrigin: "top",
                      transform: "rotateX(90deg)",
                      backgroundColor: sideA,
                    }}
                  />
                ))}
                {/* short sides (x = 0 and x = w) */}
                {[0, w].map((x) => (
                  <div
                    key={`x${x}`}
                    style={{
                      ...face,
                      left: x,
                      top: 0,
                      width: THICKNESS,
                      height: d,
                      transformOrigin: "left",
                      transform: "rotateY(-90deg)",
                      backgroundColor: sideB,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown list */}
      <div>
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-accent-soft">
          Floor-wise built-up area
        </p>
        <ul className="mt-5 divide-y divide-border">
          {listOrder.map((f) => {
            const isActive = active === f.i;
            return (
              <li
                key={f.label}
                onMouseEnter={() => setActive(f.i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive((cur) => (cur === f.i ? null : f.i))}
                className={`cursor-pointer py-3 transition-opacity ${
                  active !== null && !isActive ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-4 font-sans">
                  <span className={`text-sm ${isActive ? "text-accent" : "text-foreground"}`}>
                    {f.label}
                  </span>
                  <span className="font-display text-lg text-foreground tabular-nums">
                    {fmt(f.sqft)}
                    <span className="ml-1 font-sans text-xs text-foreground-muted">sq. ft.</span>
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-accent/10">
                  <div
                    className={`h-full rounded-full ${isActive ? "bg-accent-cyan" : "bg-accent"}`}
                    style={{
                      width: open ? `${(f.sqft / maxSqft) * 100}%` : "0%",
                      transition: `width 1000ms cubic-bezier(0.22, 1, 0.36, 1) ${f.i * 90}ms`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-baseline justify-between border-t-2 border-foreground/80 pt-4 font-sans">
          <span className="text-sm font-medium uppercase tracking-[0.15em] text-foreground">Total</span>
          <span className="font-display text-2xl text-foreground">
            {total}
          </span>
        </div>
        <p className="mt-3 font-sans text-xs text-foreground-muted">
          Figures rounded to the nearest sq. ft.
        </p>
      </div>
    </div>
  );
}
