import { Reveal } from "@/components/ui/Reveal";
import type { Project } from "@/data/projects";

interface GalleryProps {
  project: Project;
}

const EYEBROW =
  "inline-block rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm";

function PlaceholderTile({ index }: { index: number }) {
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-border bg-background-elevated">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-foreground-muted">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="font-sans text-xs">Photo {index + 1} coming soon</span>
      </div>
    </div>
  );
}

export function Gallery({ project }: GalleryProps) {
  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className={EYEBROW}>Gallery</p>
          <h2 className="mt-4 font-display text-3xl text-foreground sm:text-5xl">The finished home</h2>
          <p className="mx-auto mt-3 max-w-xl font-sans text-foreground-muted">
            Real photos of {project.name} land here once the shoot is in. For now, here&apos;s where
            they&apos;ll go.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: project.galleryPlaceholderCount }).map((_, i) => (
            <PlaceholderTile key={i} index={i} />
          ))}
        </Reveal>

        <Reveal
          delay={0.15}
          className="mt-16 rounded-3xl border border-dashed border-border bg-background-elevated p-12 text-center"
        >
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent-soft">Coming soon</p>
          <h3 className="mt-3 font-display text-2xl text-foreground">360° room panoramas</h3>
          <p className="mx-auto mt-2 max-w-md font-sans text-sm text-foreground-muted">
            Walk through each room in 360° once panorama captures are ready.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
