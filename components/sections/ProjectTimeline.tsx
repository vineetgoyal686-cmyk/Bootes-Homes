import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { formatDate } from "@/lib/format";
import type { Project } from "@/data/projects";

interface ProjectTimelineProps {
  project: Project;
}

const EYEBROW =
  "inline-block rounded-full border border-border bg-background-elevated/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm";

interface Step {
  label: string;
  dateLabel: string;
  description: string;
  current: boolean;
}

export function ProjectTimeline({ project }: ProjectTimelineProps) {
  const steps: Step[] = [
    {
      label: "Project start",
      dateLabel: formatDate(project.startDate),
      description: "Site survey and planning kick off the project.",
      current: false,
    },
    ...project.milestones.map((m) => ({
      label: m.label,
      dateLabel: m.date ? formatDate(m.date) : "In progress",
      description: m.description,
      // Only the final step (below) represents "right now" - a milestone
      // with no date yet is still a fixed point in the past, not the live
      // status, so it shouldn't pulse too.
      current: false,
    })),
    {
      label: project.completionDate ? "Complete" : "Ongoing",
      dateLabel: project.completionDate ? formatDate(project.completionDate) : "Present",
      description: project.completionDate
        ? "Construction wraps up and the home is ready."
        : "Work continues - this page updates as the build progresses.",
      current: !project.completionDate,
    },
  ];

  return (
    <section className="overflow-hidden bg-background px-6 py-24">
      <Reveal className="mx-auto mb-16 max-w-2xl text-center">
        <p className={EYEBROW}>The journey</p>
        <h2 className="mt-4 font-display text-3xl text-foreground sm:text-5xl">Project timeline</h2>
        <p className="mx-auto mt-3 max-w-xl font-sans text-foreground-muted">
          Every stage of {project.name}, from the first survey to today.
        </p>
      </Reveal>

      <div className="mx-auto max-w-6xl [perspective:1600px]">
        <div className="relative flex flex-col gap-14 sm:flex-row sm:items-start sm:gap-4">
          {/* Connecting line, behind the markers - desktop only. A vertical
              gradient (light top edge, darker bottom) reads as a rounded 3D
              rail rather than a flat rule. */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-2 rounded-full sm:block"
            style={{
              background: "linear-gradient(to bottom, rgba(62,76,156,0.35), rgba(62,76,156,0.12))",
              boxShadow: "0 2px 3px rgba(26,31,54,0.15), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          />

          {steps.map((step, i) => {
            // Alternating tilt + vertical offset per card - this is what
            // makes the row read as 3D at rest, not just something that
            // reveals itself on hover.
            const baseRotateY = i % 2 === 0 ? -7 : 7;
            const stagger = i % 2 === 0 ? "sm:translate-y-0" : "sm:translate-y-8";

            return (
              // Stagger lives on this outer wrapper, not the Reveal below -
              // Reveal's GSAP entrance animation sets its own inline
              // `transform` on mount/settle, which would otherwise stomp on a
              // Tailwind translate-y class applied to the same element.
              <div key={step.label} className={`relative flex-1 ${stagger}`}>
              <Reveal delay={i * 0.08}>
                <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                  {/* 3D disc marker: layered shadows simulate a raised puck sitting on the rail. */}
                  <div
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-medium ${
                      step.current
                        ? "bg-accent text-accent-foreground"
                        : "bg-background-elevated text-foreground"
                    }`}
                    style={{
                      boxShadow: step.current
                        ? "0 6px 16px -4px rgba(62,76,156,0.55), 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4)"
                        : "0 6px 14px -6px rgba(26,31,54,0.25), 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.6)",
                    }}
                  >
                    {step.current ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-foreground opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-foreground" />
                      </span>
                    ) : (
                      i + 1
                    )}
                  </div>

                  <div className="relative mt-4 w-full max-w-xs">
                    {/* Depth layer: a second card offset behind, giving the
                        top card real-looking thickness/edge rather than a
                        flat drop shadow. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl bg-accent/15"
                    />
                    <TiltCard baseRotateY={baseRotateY} className="relative">
                      <div
                        className="rounded-2xl border border-border bg-background-elevated p-5"
                        style={{ boxShadow: "0 16px 28px -12px rgba(26,31,54,0.25)" }}
                      >
                        <p className="font-display text-base text-foreground">{step.label}</p>
                        <p className="mt-1 font-sans text-xs uppercase tracking-wide text-accent">
                          {step.dateLabel}
                        </p>
                        <p className="mt-2 font-sans text-sm text-foreground-muted">
                          {step.description}
                        </p>
                      </div>
                    </TiltCard>
                  </div>
                </div>
              </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
