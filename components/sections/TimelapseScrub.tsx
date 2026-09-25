"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TimelapseCanvas } from "@/components/canvas/TimelapseCanvas";
import { TimelapseModal } from "@/components/modals/TimelapseModal";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

export function TimelapseScrub() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    }, wrapperRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapperRef} className="relative h-[350vh] w-full bg-foreground">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
        <TimelapseCanvas progressRef={progressRef} device={isMobile ? "mobile" : "desktop"} />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

        <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex flex-col items-center gap-3 px-6 text-center sm:top-28">
          <p className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-white backdrop-blur-sm">
            The timelapse
          </p>
          <h2 className="font-display text-3xl text-white sm:text-5xl">Every month, on camera</h2>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-44 z-10 flex justify-center px-6 sm:top-52">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="pointer-events-auto rounded-full bg-white px-6 py-3 font-sans text-sm font-medium text-foreground shadow-lg transition-transform hover:scale-105"
          >
            Watch full timelapse
          </button>
        </div>
      </div>

      <TimelapseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
