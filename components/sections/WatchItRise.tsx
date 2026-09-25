"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { BuildScene } from "@/components/canvas/BuildScene";
import { useLightExperience } from "@/lib/hooks/use-light-experience";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import type { Project } from "@/data/projects";

/**
 * "Watch it rise": a tall (300vh) section whose inner canvas is CSS `sticky`
 * (so it visually pins without fighting Lenis/GSAP over DOM pinning), while a
 * ScrollTrigger tied to the same wrapper just tracks 0-1 progress through that
 * scroll range and hands it to the 3D scene via a ref (no React re-renders per
 * scroll tick - BuildScene reads the ref directly inside useFrame).
 */
export function WatchItRise({ project }: { project: Project }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const lightExperience = useLightExperience();
  const isMobile = useIsMobile();
  const [inView, setInView] = useState(true);

  // This section is 300vh tall and its Canvas has no other reason to stop
  // rendering once scrolled past - without this it kept running every frame
  // for the rest of the page (competing with the timelapse/x-ray sections and
  // making scroll feel heavy).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "600px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (lightExperience || !wrapperRef.current) return;

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
  }, [lightExperience]);

  if (lightExperience) {
    return (
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-blueprint-paper px-6 py-24 text-center">
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-accent-soft">The build</p>
        <h2 className="font-display text-3xl text-foreground sm:text-5xl">Watch it rise</h2>
        <p className="max-w-xl font-sans text-foreground-muted">
          From foundation to finish, built by Bootes Homes in {project.location}.
        </p>
      </section>
    );
  }

  return (
    <section ref={wrapperRef} className="relative h-[300vh] w-full bg-blueprint-paper">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {inView && (
          <Canvas
            dpr={[1, isMobile ? 1.5 : 2]}
            shadows
            gl={{ antialias: true, localClippingEnabled: true, toneMappingExposure: 1.05 }}
            camera={{ fov: 38, position: [10, 6, 10] }}
          >
            <PerformanceMonitor>
              <AdaptiveDpr pixelated={false} />
              <BuildScene progressRef={progressRef} />
            </PerformanceMonitor>
          </Canvas>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex flex-col items-center gap-3 px-6 text-center sm:top-28">
          <p className="rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm backdrop-blur-sm">
            The build
          </p>
          <h2 className="font-display text-3xl text-foreground sm:text-5xl">Watch it rise</h2>
        </div>
      </div>
    </section>
  );
}
