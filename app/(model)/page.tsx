import type { Metadata } from "next";
import { ProjectShowcase } from "@/components/ProjectShowcase";
import { featuredProject } from "@/data/projects";

export const metadata: Metadata = {
  title: "Bootes Homes | Home Builder in Noida",
  description: featuredProject.heroSubtitle,
  openGraph: {
    title: `${featuredProject.name} | Bootes Homes`,
    description: featuredProject.heroSubtitle,
    images: ["/media/posters/poster-start.jpg"],
  },
};

export default function Home() {
  return <ProjectShowcase project={featuredProject} />;
}
