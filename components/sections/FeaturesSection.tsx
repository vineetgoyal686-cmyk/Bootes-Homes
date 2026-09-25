import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import type { Project } from "@/data/projects";

const EYEBROW =
  "inline-block rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm";

// Simple line icons keyed by feature id; unknown ids fall back to a generic mark.
const ICONS: Record<string, ReactNode> = {
  radiant: (
    <>
      <path d="M3 18h18" />
      <path d="M5 14c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0" />
      <path d="M5 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0" />
    </>
  ),
  chiller: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="8.5" cy="12" r="3" />
      <circle cx="15.5" cy="12" r="3" />
    </>
  ),
  solar: (
    <>
      <path d="M4 20 7 10h10l3 10z" />
      <path d="M5.5 15h13M12 10v10" />
      <path d="M12 3v2M5.6 5.6l1.4 1.4M18.4 5.6 17 7" />
    </>
  ),
  "water-treatment": (
    <>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  "smart-home": (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 15a3 3 0 0 1 4 0M8.5 13a5 5 0 0 1 7 0" />
    </>
  ),
};

const FALLBACK_ICON = <circle cx="12" cy="12" r="8" />;

/** Specs still marked "TBD" in the data are hidden rather than shown to
 * visitors - they appear automatically once real figures are filled in. */
function isConfirmedSpec(spec: string) {
  return spec.trim() !== "" && !/\bTBD\b/i.test(spec);
}

export function FeaturesSection({ project }: { project: Project }) {
  return (
    <section className="bg-background px-6 py-24">
      <Reveal className="mx-auto mb-14 max-w-3xl text-center">
        <p className={EYEBROW}>Technology</p>
        <h2 className="mt-4 font-display text-3xl text-foreground sm:text-5xl">
          What&apos;s built into the walls
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-sans text-foreground-muted">
          The systems that make this house quieter, cooler and cheaper to run - designed in from
          day one, not added later.
        </p>
      </Reveal>

      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {project.features.map((f, i) => (
          <Reveal
            key={f.id}
            delay={i * 0.06}
            // The lead feature gets a double-width card so five cards still
            // form a balanced 3-column grid (2+1 / 1+1+1).
            className={`flex flex-col rounded-2xl border border-border bg-background-elevated p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8 ${
              i === 0 ? "sm:col-span-2" : ""
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {ICONS[f.id] ?? FALLBACK_ICON}
              </svg>
            </span>
            <h3 className="mt-5 font-display text-xl text-foreground">{f.name}</h3>
            <p className="mt-2 font-sans text-sm leading-relaxed text-foreground-muted">
              {f.description}
            </p>
            <ul className="mt-4 space-y-2">
              {f.benefits.map((b) => (
                <li key={b} className="flex gap-2 font-sans text-sm text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {b}
                </li>
              ))}
            </ul>
            {isConfirmedSpec(f.spec) && (
              <div className="mt-auto pt-5">
                <p className="border-t border-border pt-4 font-sans text-xs text-accent-soft">
                  {f.spec}
                </p>
              </div>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
