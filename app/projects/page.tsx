import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { projects } from "@/data/projects";
import { media } from "@/lib/media";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Projects | Bootes Homes",
  description: "Completed homes built by Bootes Homes in Noida.",
};

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-background px-6 pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="inline-block rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm">
            Projects
          </p>
          <h1 className="mt-4 font-display text-4xl text-foreground sm:text-5xl">
            Homes we&apos;ve built
          </h1>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 grid gap-8 sm:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className="group overflow-hidden rounded-2xl border border-border bg-background-elevated transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={media.posters.end()}
                  alt={`${project.name} - completed exterior`}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-accent-soft">
                  {project.location}
                </p>
                <h2 className="mt-2 font-display text-2xl text-foreground">{project.name}</h2>
                <p className="mt-2 font-sans text-sm text-foreground-muted">{project.tagline}</p>
              </div>
            </Link>
          ))}
        </Reveal>
      </div>
    </main>
  );
}
