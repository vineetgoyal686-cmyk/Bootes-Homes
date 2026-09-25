import { Hero } from "@/components/sections/Hero";
import { TimelapseSection } from "@/components/sections/TimelapseSection";
import { ProjectTimeline } from "@/components/sections/ProjectTimeline";
import { JourneyStory } from "@/components/sections/JourneyStory";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { ProjectStats } from "@/components/sections/ProjectStats";
import { Gallery } from "@/components/sections/Gallery";
import { ContactSection } from "@/components/sections/ContactSection";
import type { Project } from "@/data/projects";

/** The full scroll experience for one project - shared between the Home page
 * (which features the flagship project) and /projects/[slug]. */
export function ProjectShowcase({ project }: { project: Project }) {
  return (
    <main>
      <Hero project={project} />
      <TimelapseSection />
      {/* The photo story covers the same stages with real photos; the card
          timeline stays as the fallback for projects without them. */}
      {project.journey.length > 0 ? (
        <JourneyStory project={project} />
      ) : (
        <ProjectTimeline project={project} />
      )}
      <FeaturesSection project={project} />
      <ProjectStats project={project} />
      <Gallery project={project} />
      <ContactSection project={project} />
    </main>
  );
}
