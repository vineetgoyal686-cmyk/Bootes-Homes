import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "About | Bootes Homes",
  description: "Bootes Homes is a home construction company based in Noida.",
};

const VALUES = [
  {
    title: "Built to last",
    body: "Every home is engineered first, styled second — structure and systems come before finishes.",
  },
  {
    title: "Fully transparent",
    body: "Construction is documented start to finish, so you always know exactly what stage your home is at.",
  },
  {
    title: "Systems-first design",
    body: "Radiant cooling, water treatment and smart controls are planned into the house from day one, not added later.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background pb-24 pt-32 sm:pt-40">
      <Reveal className="mx-auto max-w-3xl px-6 text-center">
        <Logo variant="mark" height={40} className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl text-foreground sm:text-5xl">About Bootes Homes</h1>
        {/* TODO(client): replace with real company history/founding story. */}
        <p className="mx-auto mt-4 max-w-xl font-sans text-foreground-muted">
          Bootes Homes is a home construction company based in Noida, building custom houses with the
          structure, systems and finish quality of a modern build — documented end to end.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mx-auto mt-16 grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-border bg-background-elevated p-6">
            <h2 className="font-display text-lg text-foreground">{v.title}</h2>
            <p className="mt-2 font-sans text-sm text-foreground-muted">{v.body}</p>
          </div>
        ))}
      </Reveal>
    </main>
  );
}
