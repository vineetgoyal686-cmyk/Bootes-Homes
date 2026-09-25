"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { TimelapsePlayer, type TimelapsePlayerHandle } from "@/components/timelapse/TimelapsePlayer";
import { Reveal } from "@/components/ui/Reveal";
import { media } from "@/lib/media";
import type { Project } from "@/data/projects";

const EYEBROW =
  "inline-block rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm";

const DAY_MS = 86_400_000;

/**
 * The construction timelapse, watched right on the page: story and a
 * month-by-month chapter list on the left, the player on the right. Clicking
 * a month plays from there; the month currently on screen is highlighted.
 */
export function TimelapseSection({ project }: { project: Project }) {
  const chapters = project.timelapseChapters;
  const marks = project.timelapseDates;
  const playerRef = useRef<TimelapsePlayerHandle>(null);
  const [active, setActive] = useState<number | null>(null);

  const days =
    marks.length > 1
      ? Math.round(
          (new Date(`${marks[marks.length - 1].date}T00:00:00`).getTime() -
            new Date(`${marks[0].date}T00:00:00`).getTime()) /
            DAY_MS
        )
      : null;

  const onProgress = (t: number) => {
    let idx = 0;
    for (let i = 0; i < chapters.length; i++) if (t >= chapters[i].t) idx = i;
    setActive((cur) => (cur === idx ? cur : idx));
  };

  return (
    <section className="bg-background px-6 py-24">
      {/* Mobile order: heading, player, chapters. Desktop: heading + chapters
          stacked on the left, player spanning both rows on the right. */}
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.45fr] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-8">
        <Reveal className="lg:col-start-1 lg:row-start-1">
          <p className={EYEBROW}>The timelapse</p>
          <h2 className="mt-4 font-display text-3xl text-foreground sm:text-5xl">
            {days ? `${days} days,` : "The whole build,"}
            <br />
            <span className="text-accent">in two minutes.</span>
          </h2>
          <p className="mt-4 max-w-md font-sans text-foreground-muted">
            Every working day on the site camera, from the old house coming down to the top slab.
            Pick a month to jump straight in.
          </p>
        </Reveal>

        {/* Player */}
        <Reveal className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <TimelapsePlayer
            handleRef={playerRef}
            marks={marks}
            poster={media.timelapse("mar.webp")}
            onProgress={onProgress}
          />
        </Reveal>

        {/* Month chapters */}
        <Reveal className="lg:col-start-1 lg:row-start-2">
          <ol className="space-y-1.5">
            {chapters.map((c, i) => {
              const isActive = active === i;
              return (
                <li key={c.image}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(i);
                      playerRef.current?.playFrom(c.t);
                    }}
                    aria-current={isActive ? "true" : undefined}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-2 pr-4 text-left transition-all duration-300 ${
                      isActive
                        ? "border-accent/30 bg-background-elevated shadow-md"
                        : "border-transparent hover:border-border hover:bg-background-elevated/70"
                    }`}
                  >
                    <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-foreground/10 sm:h-16 sm:w-24">
                      <Image
                        src={media.timelapse(`${c.image}.webp`)}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span
                          className={`font-sans text-[11px] font-medium uppercase tracking-[0.2em] ${
                            isActive ? "text-accent" : "text-accent-soft"
                          }`}
                        >
                          {c.month}
                        </span>
                        <span className="truncate font-display text-base text-foreground sm:text-lg">{c.title}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 block font-sans text-xs text-foreground-muted sm:text-sm">
                        {c.caption}
                      </span>
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "bg-foreground/5 text-foreground group-hover:bg-accent group-hover:text-accent-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5" fill="currentColor">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                      </svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
