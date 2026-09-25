import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectShowcase } from "@/components/ProjectShowcase";
import { getProject, projects } from "@/data/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.name} | Bootes Homes`,
    description: project.heroSubtitle,
    openGraph: {
      title: project.name,
      description: project.heroSubtitle,
      images: ["/media/posters/poster-start.jpg"],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return <ProjectShowcase project={project} />;
}
