"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatDate } from "@/lib/format";
import { media } from "@/lib/media";
import { ThenAndNow } from "@/components/sections/ThenAndNow";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import type { Project } from "@/data/projects";

gsap.registerPlugin(ScrollTrigger);

/** Vertical scroll spent per px of horizontal travel - under 1 keeps the
 * pinned stretch short while the cards still glide past. */
const SCROLL_PER_PX = 0.45;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "The journey": the stages as a pinned, horizontally scrolling gallery of
 * 3D cards (each swings into place as it reaches the centre, photos drifting
 * at their own depth), closing on a drag-to-compare Then & Now.
 *
 * The page's vertical scroll drives the track via a scrubbed GSAP tween on a
 * CSS-sticky stage; per-card transforms are written straight to the DOM in
 * the tween's onUpdate, so React never re-renders while scrolling.
 */
export function JourneyStory({ project }: { project: Project }) {
  const stages = project.journey;
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<HTMLSpanElement[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);

  // Every journey photo in order, so the viewer can step through the whole
  // story from whichever photo was clicked.
  const gallery = useMemo(() => {
    const list: LightboxImage[] = [];
    const start: number[] = [];
    stages.forEach((s) => {
      start.push(list.length);
      s.images.forEach((img) =>
        list.push({
          src: media.journey(img.name),
          alt: `${s.label} - ${project.name}`,
          width: img.width,
          height: img.height,
          caption: `${s.label} · ${formatDate(s.date)}`,
        })
      );
    });
    return { list, start };
  }, [stages, project.name]);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const travel = () => Math.max(0, track.scrollWidth - window.innerWidth);
    // Pinned length follows the track's real width (it changes with the
    // viewport), so the section height is set here rather than in CSS.
    const size = () => {
      section.style.height = `${window.innerHeight + travel() * SCROLL_PER_PX}px`;
    };
    size();

    const place = () => {
      const vw = window.innerWidth;
      cardRefs.current.forEach((card) => {
        if (!card) return;
        const r = card.getBoundingClientRect();
        // -1 (a screen to the left) .. 0 (centred) .. 1 (a screen to the right)
        const d = Math.max(-1.5, Math.min(1.5, (r.left + r.width / 2 - vw / 2) / vw));
        const inner = card.firstElementChild as HTMLElement | null;
        if (inner) {
          inner.style.transform = `rotateY(${(-d * 16).toFixed(2)}deg) scale(${(1 - Math.min(Math.abs(d) * 0.1, 0.1)).toFixed(3)})`;
          inner.style.opacity = String(1 - Math.min(Math.abs(d) * 0.35, 0.45));
        }
        card.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => {
          el.style.translate = `${(-d * Number(el.dataset.depth)).toFixed(1)}px 0`;
        });
      });
    };

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => -travel(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          invalidateOnRefresh: true,
          onRefreshInit: size,
          onUpdate: (self) => {
            if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
            const idx = Math.min(stages.length - 1, Math.floor(self.progress * stages.length * 1.05));
            labelRefs.current.forEach((el, i) => el?.setAttribute("data-active", String(i <= idx)));
          },
        },
        onUpdate: place,
      });
    }, section);
    place();

    return () => ctx.revert();
  }, [stages.length]);

  return (
    <div className="bg-[#0b0e1a] text-white">
      <section ref={sectionRef} className="relative" style={{ height: "300vh" }}>
        <div className="sticky top-0 h-[100svh] overflow-hidden [perspective:1600px]">
          {/* Soft light in the dark */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 top-1/4 h-[60vh] w-[60vh] rounded-full bg-accent/25 blur-[120px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 bottom-0 h-[50vh] w-[50vh] rounded-full bg-accent-cyan/10 blur-[120px]"
          />

          <div
            ref={trackRef}
            className="relative flex h-full items-center gap-6 pl-6 pr-6 sm:gap-[4vw] sm:pr-[8vw] pt-16 will-change-transform sm:pl-16"
          >
            {/* Intro */}
            <div className="w-[80vw] shrink-0 sm:w-[38vw] lg:w-[30vw]">
              <p className="font-sans text-xs uppercase tracking-[0.35em] text-accent-cyan">The journey</p>
              <h2 className="mt-5 font-display text-4xl leading-[1.05] sm:text-6xl">
                From old house
                <br />
                <span className="italic text-white/60">to new home.</span>
              </h2>
              <p className="mt-6 max-w-sm font-sans text-white/60">
                One plot in Sector 20, four moments in time - told in the photos taken along the way.
              </p>
              <p className="mt-10 inline-flex items-center gap-3 font-sans text-xs uppercase tracking-[0.3em] text-white/50">
                Scroll to walk through
                <span className="inline-block animate-[nudge-x_1.6s_ease-in-out_infinite]">→</span>
              </p>
            </div>

            {stages.map((s, i) => {
              const [main, ...rest] = s.images;
              return (
                <div
                  key={s.label}
                  ref={(el) => {
                    if (el) cardRefs.current[i] = el;
                  }}
                  className="h-[68svh] w-[calc(100vw-3rem)] shrink-0 [transform-style:preserve-3d] sm:w-[72vw] lg:w-[64vw]"
                >
                  <article className="grid h-full grid-rows-[1fr_auto] gap-5 will-change-transform lg:grid-cols-[0.62fr_1.38fr] lg:grid-rows-1 lg:gap-8">
                    {/* Text */}
                    <div className="order-2 flex flex-col justify-end lg:order-1 lg:pb-6">
                      <span
                        className="font-display text-6xl leading-none text-transparent sm:text-8xl"
                        style={{ WebkitTextStroke: "1px rgba(255,255,255,0.35)" }}
                      >
                        {pad(i + 1)}
                      </span>
                      <p className="mt-3 font-sans text-xs uppercase tracking-[0.3em] text-accent-cyan">
                        {s.label} · {formatDate(s.date)}
                      </p>
                      <h3 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl">{s.tagline}</h3>
                      <p className="mt-3 max-w-sm font-sans text-sm text-white/60 sm:text-base">{s.caption}</p>
                    </div>

                    {/* Photos: main shot + supporting shots layered in front */}
                    <div className="relative order-1 min-h-0 lg:order-2">
                      <button
                        type="button"
                        onClick={() => setViewing(gallery.start[i])}
                        aria-label={`View ${s.label} photos full screen`}
                        className="group/photo absolute inset-0 cursor-zoom-in overflow-hidden rounded-3xl bg-white/5 text-left shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
                      >
                        <div data-depth="40" className="absolute -inset-x-10 inset-y-0">
                          <Image
                            src={media.journey(main.name)}
                            alt={`${s.label} - ${project.name}`}
                            fill
                            sizes="(min-width: 1024px) 44vw, 86vw"
                            className="object-cover transition-transform duration-700 group-hover/photo:scale-[1.03]"
                            style={{ objectPosition: main.focus }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.25em] text-white backdrop-blur-md">
                          {s.view}
                        </span>
                        <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 font-sans text-[11px] text-white backdrop-blur-md transition-colors group-hover/photo:bg-white group-hover/photo:text-foreground">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                            <path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" />
                          </svg>
                          {s.images.length > 1 ? `${s.images.length} photos` : "View"}
                        </span>
                      </button>

                      {rest.slice(0, 2).map((img, j) => (
                        <button
                          type="button"
                          key={img.name}
                          onClick={() => setViewing(gallery.start[i] + j + 1)}
                          aria-label={`View ${s.label} photo ${j + 2} full screen`}
                          data-depth={j === 0 ? "-70" : "-110"}
                          className={`absolute hidden cursor-zoom-in overflow-hidden rounded-2xl border-4 border-[#0b0e1a] shadow-2xl transition-transform duration-300 hover:scale-105 sm:block ${
                            j === 0
                              ? "-bottom-6 -left-8 h-[38%] w-[34%] -rotate-3"
                              : "-right-6 -top-6 h-[30%] w-[28%] rotate-3"
                          }`}
                        >
                          <Image
                            src={media.journey(img.name)}
                            alt=""
                            fill
                            sizes="20vw"
                            className="object-cover"
                            style={{ objectPosition: img.focus }}
                          />
                        </button>
                      ))}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>

          {/* Progress */}
          <div className="absolute inset-x-6 bottom-6 sm:inset-x-16 sm:bottom-8">
            <div className="h-px w-full bg-white/15">
              <div
                ref={barRef}
                className="h-full origin-left bg-gradient-to-r from-accent to-accent-cyan"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <div className="mt-3 flex justify-between">
              {stages.map((s, i) => (
                <span
                  key={s.label}
                  ref={(el) => {
                    if (el) labelRefs.current[i] = el;
                  }}
                  data-active={i === 0}
                  className="font-sans text-[11px] uppercase tracking-[0.25em] text-white/35 transition-colors duration-500 data-[active=true]:text-white"
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {stages.length > 1 && <ThenAndNow before={stages[0]} after={stages[stages.length - 1]} />}

      <Lightbox images={gallery.list} index={viewing} onClose={() => setViewing(null)} onIndexChange={setViewing} />
    </div>
  );
}
