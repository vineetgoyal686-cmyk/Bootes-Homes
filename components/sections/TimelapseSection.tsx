"use client";

import { useState } from "react";
import Image from "next/image";
import { TimelapseModal } from "@/components/modals/TimelapseModal";
import { Reveal } from "@/components/ui/Reveal";
import { media } from "@/lib/media";

/**
 * The construction timelapse as a click-to-watch card: nothing plays on
 * scroll. Clicking opens TimelapseModal, where the video plays normally and
 * the viewer can change its speed.
 */
export function TimelapseSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-foreground px-6 py-24">
      <Reveal className="mx-auto mb-10 max-w-3xl text-center">
        <p className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-white">
          The timelapse
        </p>
        <h2 className="mt-4 font-display text-3xl text-white sm:text-5xl">Every month, on camera</h2>
        <p className="mx-auto mt-3 max-w-xl font-sans text-white/70">
          The whole build, straight from the site camera, in about two minutes.
        </p>
      </Reveal>

      <Reveal className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Watch the construction timelapse"
          className="group relative block aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-2xl"
        >
          <Image
            src={media.posters.end()}
            alt=""
            fill
            sizes="(min-width: 1024px) 64rem, 100vw"
            // Scaled from the top so the camera's timestamp/watermark strip along
            // the bottom edge falls outside the card.
            className="origin-top scale-[1.12] object-cover opacity-80 transition duration-700 group-hover:scale-[1.15] group-hover:opacity-90"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

          <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform duration-300 group-hover:scale-110 sm:h-24 sm:w-24">
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 text-foreground sm:h-10 sm:w-10" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
          </span>

          <span className="absolute bottom-5 left-5 text-left sm:bottom-7 sm:left-8">
            <span className="block font-display text-xl text-white sm:text-2xl">Watch the full timelapse</span>
            <span className="mt-1 block font-sans text-xs uppercase tracking-[0.2em] text-white/70">
              ~2 min · change speed while you watch
            </span>
          </span>
        </button>
      </Reveal>

      <TimelapseModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
