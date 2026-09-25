import type { Metadata } from "next";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { featuredProject } from "@/data/projects";

export const metadata: Metadata = {
  title: "Technology | Bootes Homes",
  description:
    "Radiant floor cooling and heating, rooftop chillers, solar and smart-home systems built into every Bootes Homes project.",
};

export default function TechnologyPage() {
  return (
    <main className="min-h-screen bg-background pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Built-in, not bolted-on</h1>
        <p className="mx-auto mt-4 max-w-xl font-sans text-foreground-muted">
          Every Bootes Homes project is designed around the same core systems — shown here on our
          Sector 20 house.
        </p>
      </div>

      <div className="mt-16">
        <FeaturesSection project={featuredProject} />
      </div>
    </main>
  );
}
