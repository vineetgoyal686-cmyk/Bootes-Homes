"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { BuildScene } from "@/components/canvas/BuildScene";
import { useLightExperience } from "@/lib/hooks/use-light-experience";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useInView } from "@/lib/hooks/use-in-view";
import { useHouseLoader } from "@/lib/store/house-loader";
import { media } from "@/lib/media";
import type { Project } from "@/data/projects";

export function Hero({ project }: { project: Project }) {
  const lightExperience = useLightExperience();
  const isMobile = useIsMobile();
  const loaded = useHouseLoader((s) => s.loaded);
  const [visible, setVisible] = useState(false);
  // Hero is a full 300vh+ scroll away from the rest of the page once the user
  // is deep into the timelapse/x-ray sections - without this, its Canvas kept
  // rendering every frame forever, competing with whichever 3D section was
  // actually on screen and making scroll feel heavy.
  const { ref: inViewRef, inView } = useInView<HTMLElement>("600px");

  useEffect(() => {
    if (!loaded) return;
    // Small delay so the fade-in starts once the loading screen has begun its own
    // exit transition, rather than both firing in the same frame.
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <section ref={inViewRef} className="relative h-[100svh] w-full overflow-hidden bg-background">
      {/* Model: full-bleed background on mobile/tablet, confined to the right
          half on desktop so it doesn't compete with the text for space -
          BuildScene re-fits its camera to whatever width this ends up with
          (see computeFraming's aspect param). */}
      <div className="absolute inset-0 lg:left-[38%] lg:right-0">
        {!lightExperience ? (
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            {inView && (
              <Canvas
                dpr={[1, isMobile ? 1.5 : 2]}
                shadows
                camera={{ fov: 32, position: [10, 6, 10] }}
                gl={{ antialias: true, localClippingEnabled: true, toneMappingExposure: 1.05 }}
              >
                <PerformanceMonitor>
                  <AdaptiveDpr pixelated={false} />
                  <BuildScene />
                </PerformanceMonitor>
              </Canvas>
            )}
          </div>
        ) : (
          <Image
            src={media.journey("today")}
            alt={`${project.name} - exterior in ${project.location}`}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-top opacity-90"
          />
        )}
      </div>

      {/* Scrim: fades up from the bottom on mobile (text overlays the image
          there), fades in from the left on desktop (text column reads over
          the model instead). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background from-15% via-transparent via-55% to-background/50 lg:bg-gradient-to-r lg:from-background lg:from-35% lg:via-background/0 lg:via-50% lg:to-transparent" />

      <div className="relative z-10 flex h-full flex-col items-center justify-end gap-5 px-6 pb-24 text-center sm:pb-28 lg:max-w-xl lg:items-start lg:justify-center lg:px-16 lg:pb-0 lg:text-left">
        <p className="rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm backdrop-blur-sm">
          {project.location}
        </p>
        <h1 className="text-balance font-display text-4xl font-medium leading-tight text-foreground sm:text-6xl">
          {project.tagline}
        </h1>
        <p className="max-w-xl text-balance font-sans text-base text-foreground-muted sm:text-lg">
          {project.heroSubtitle}
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-foreground-muted lg:left-16 lg:translate-x-0">
        <span className="animate-bounce font-sans text-xs uppercase tracking-widest">
          Scroll to explore
        </span>
      </div>
    </section>
  );
}
