"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatDate } from "@/lib/format";
import { media } from "@/lib/media";
import type { Project } from "@/data/projects";

gsap.registerPlugin(ScrollTrigger);

const EYEBROW =
  "inline-block rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "The journey": a pinned, scroll-driven photo story - one real photo per
 * stage (before -> demolition -> foundation -> today). Same CSS-sticky +
 * ScrollTrigger-progress pattern as TimelapseScrub; React state only changes
 * when the stage index does (a handful of times), while the thin progress
 * bar is written straight to the DOM every scroll tick.
 *
 * The stages mix street-level and site-camera photos, so they cross-fade
 * (with a slow settle-in zoom) rather than wipe - a wipe only reads well
 * between photos taken from the same spot.
 */
export function JourneyStory({ project }: { project: Project }) {
  const stages = project.journey;
  const wrapperRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const idx = Math.min(stages.length - 1, Math.floor(self.progress * stages.length));
          setActive((cur) => (cur === idx ? cur : idx));
          if (progressBarRef.current) {
            progressBarRef.current.style.transform = `scaleX(${self.progress})`;
          }
        },
      });
    }, wrapperRef);
    return () => ctx.revert();
  }, [stages.length]);

  // Jump to the middle of a stage's scroll band.
  const goTo = (i: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / stages.length) * range, behavior: "smooth" });
  };

  const stage = stages[active];

  return (
    <section
      ref={wrapperRef}
      className="relative w-full bg-background"
      style={{ height: `${stages.length * 85 + 15}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] w-full flex-col overflow-hidden px-6 pb-8 pt-24 sm:pt-28 lg:px-16">
        <div className="mx-auto mb-6 w-full max-w-6xl text-center lg:mb-10 lg:text-left">
          <p className={EYEBROW}>The journey</p>
          <h2 className="mt-3 font-display text-3xl text-foreground sm:text-5xl">
            From old house to new home
          </h2>
        </div>

        <div className="mx-auto grid w-full max-w-6xl content-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_1.5fr] lg:content-center lg:gap-14">
          {/* Stage text + stepper */}
          <div className="order-2 flex flex-col lg:order-1 lg:justify-center">
            <div key={active} className="animate-[journey-in_600ms_cubic-bezier(0.22,1,0.36,1)]">
              <p className="font-sans text-xs uppercase tracking-[0.3em] text-accent-soft">
                {pad(active + 1)} / {pad(stages.length)} · {formatDate(stage.date)}
              </p>
              <h3 className="mt-2 font-display text-2xl text-foreground sm:text-4xl">{stage.label}</h3>
              <p className="mt-2 max-w-md font-sans text-sm text-foreground-muted sm:text-base">
                {stage.caption}
              </p>
            </div>

            <ol className="mt-6 flex gap-2 lg:mt-10 lg:flex-col lg:gap-0">
              {stages.map((s, i) => {
                const done = i <= active;
                return (
                  <li key={s.image} className="flex-1 lg:flex-none">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={i === active ? "step" : undefined}
                      className="group flex w-full items-center gap-3 py-1 text-left lg:py-2.5"
                    >
                      <span
                        className={`h-1 w-full rounded-full transition-colors duration-500 lg:h-2.5 lg:w-2.5 lg:shrink-0 ${
                          done ? "bg-accent" : "bg-accent/15"
                        } ${i === active ? "lg:ring-4 lg:ring-accent/20" : ""}`}
                      />
                      <span
                        className={`hidden font-sans text-sm transition-colors lg:inline ${
                          i === active ? "text-foreground" : "text-foreground-muted group-hover:text-foreground"
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Photo frame */}
          <div className="relative order-1 h-[46svh] overflow-hidden rounded-3xl bg-foreground shadow-2xl lg:order-2 lg:aspect-[4/3] lg:h-auto lg:max-h-[62vh] lg:w-full">
            {stages.map((s, i) => {
              const shown = i === active;
              // Landscape (site camera) photos fill the frame; portrait street
              // photos are shown whole over their own blurred backdrop.
              const landscape = s.width > s.height;
              return (
                <div
                  key={s.image}
                  aria-hidden={!shown}
                  className="absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ opacity: shown ? 1 : 0, transform: `scale(${shown ? 1 : 1.06})` }}
                >
                  {/* Blurred fill so portrait (street) and landscape (site
                      camera) photos both sit in the same frame uncropped. */}
                  <Image
                    src={media.journey(s.image, "bg")}
                    alt=""
                    fill
                    unoptimized
                    className="scale-125 object-cover opacity-70 blur-2xl"
                  />
                  <Image
                    src={media.journey(s.image)}
                    alt={`${s.label} - ${project.name}, ${formatDate(s.date)}`}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className={landscape ? "object-cover object-[60%_50%]" : "object-contain"}
                  />
                </div>
              );
            })}

            <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 font-sans text-[11px] uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              {stage.view}
            </span>

            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div
                ref={progressBarRef}
                className="h-full origin-left bg-accent-cyan"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
