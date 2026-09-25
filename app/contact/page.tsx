import type { Metadata } from "next";
import { ContactSection } from "@/components/sections/ContactSection";
import { featuredProject } from "@/data/projects";

export const metadata: Metadata = {
  title: "Contact | Bootes Homes",
  description: "Get in touch with Bootes Homes about your next construction project in Noida.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background pt-16 sm:pt-20">
      <ContactSection project={featuredProject} />
    </main>
  );
}
