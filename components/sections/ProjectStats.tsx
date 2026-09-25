"use client";

import type React from "react";

import { useCountUp } from "@/lib/hooks/use-count-up";
import { Reveal } from "@/components/ui/Reveal";
import { FloorStack } from "@/components/sections/FloorStack";
import { monthsBetween } from "@/lib/format";
import type { Project } from "@/data/projects";

interface ProjectStatsProps {
  project: Project;
}

function parseLeadingNumber(text: string): { value: number; suffix: string } {
  const match = text.match(/^([\d,]+)\s*(.*)$/);
  if (!match) return { value: 0, suffix: text };
  return { value: parseInt(match[1].replace(/,/g, ""), 10), suffix: match[2] };
}

/** Shared layout for every stat so they all line up: label on top, value
 * with its unit on one line (never wrapping), then a one-line note. */
function StatCell({
  label,
  value,
  unit,
  note,
  cellRef,
}: {
  cellRef?: React.Ref<HTMLDivElement>;
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: string;
}) {
  return (
    <div
      ref={cellRef}
      className="flex flex-col items-center gap-3 bg-background-elevated px-4 py-8 text-center sm:py-10"
    >
      <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-foreground-muted">
        {label}
      </span>
      <span className="whitespace-nowrap font-display text-4xl font-medium leading-none text-foreground tabular-nums lg:text-5xl">
        {value}
        {unit && (
          <span className="ml-1.5 font-sans text-sm font-normal text-accent lg:text-base">{unit}</span>
        )}
      </span>
      {/* Always rendered (empty or not) so every cell keeps the same height. */}
      <span className="min-h-4 font-sans text-xs text-foreground-muted/80">{note}</span>
    </div>
  );
}

function CountUpStat(props: { value: number; label: string; unit?: string; note?: string }) {
  const { ref, value } = useCountUp<HTMLDivElement>(props.value);
  return <StatCell {...props} cellRef={ref} value={value.toLocaleString("en-IN")} />;
}

const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export function ProjectStats({ project }: ProjectStatsProps) {
  const { stats } = project;
  const plot = stats.plotSize ? parseLeadingNumber(stats.plotSize) : null;
  const builtUp = parseLeadingNumber(stats.builtUpArea);
  const isOngoing = !project.completionDate;
  const duration = monthsBetween(project.constructionStartDate, project.completionDate);
  const statCount = 2 + (plot ? 1 : 0) + (duration !== null ? 1 : 0);

  const upperFloors = stats.floors.match(/^G\+(\d+)$/)?.[1];
  const durationNote = project.constructionStartDate
    ? isOngoing
      ? `Since ${monthYear(project.constructionStartDate)}`
      : `${monthYear(project.constructionStartDate)} – ${monthYear(project.completionDate!)}`
    : undefined;

  return (
    <section className="bg-background-elevated px-6 py-24">
      <Reveal
        className={`mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border ${
          statCount === 4 ? "lg:grid-cols-4" : statCount === 3 ? "lg:grid-cols-3" : ""
        }`}
      >
        {plot && (
          <CountUpStat
            label="Plot size"
            value={plot.value}
            unit={plot.suffix}
            note={stats.plotDimensions}
          />
        )}
        <CountUpStat
          label="Built-up area"
          value={builtUp.value}
          unit={builtUp.suffix}
          note={stats.floorAreas.length ? `Across ${stats.floorAreas.length} levels` : undefined}
        />
        <StatCell
          label="Floors"
          value={stats.floors}
          note={upperFloors ? `Ground + ${upperFloors} upper floors` : undefined}
        />
        {duration !== null && (
          <CountUpStat
            label={isOngoing ? "Under construction" : "Build duration"}
            value={duration}
            unit="months"
            note={durationNote}
          />
        )}
      </Reveal>

      {stats.floorAreas.length > 0 && (
        <FloorStack floors={stats.floorAreas} total={stats.builtUpArea} />
      )}
    </section>
  );
}
