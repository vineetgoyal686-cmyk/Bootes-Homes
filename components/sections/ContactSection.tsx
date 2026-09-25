"use client";

import { useState, type FormEvent } from "react";
import { Reveal } from "@/components/ui/Reveal";
import type { Project } from "@/data/projects";

interface ContactSectionProps {
  project: Project;
}

type Status = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 font-sans text-sm text-foreground placeholder:text-foreground-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function ContactSection({ project }: ContactSectionProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const whatsappHref = project.whatsappNumber
    ? `https://wa.me/${project.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I'm interested in ${project.name} in ${project.location}.`
      )}`
    : null;

  const mapSrc = project.mapEmbedQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(project.mapEmbedQuery)}&output=embed`
    : null;

  return (
    <section id="contact" className="bg-background-elevated px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="inline-block rounded-full border border-border bg-background/90 px-4 py-1.5 font-sans text-xs uppercase tracking-[0.3em] text-accent-soft shadow-sm">
            Get in touch
          </p>
          <h2 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
            Build your next home with us
          </h2>
          <p className="mt-3 max-w-md font-sans text-foreground-muted">
            Tell us about your plot and what you have in mind - we&apos;ll get back to you within a day.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <input name="name" required placeholder="Your name" className={inputClass} />
            <input name="phone" required type="tel" placeholder="Phone number" className={inputClass} />
            <input name="email" required type="email" placeholder="Email address" className={inputClass} />
            <textarea
              name="message"
              required
              rows={4}
              placeholder="Tell us about your project"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-full bg-accent px-6 py-3 font-sans text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending..." : "Send enquiry"}
            </button>
            {status === "success" && (
              <p role="status" className="font-sans text-sm text-accent">
                Thanks — we&apos;ll be in touch soon.
              </p>
            )}
            {status === "error" && (
              <p role="alert" className="font-sans text-sm text-red-600">
                {errorMessage}
              </p>
            )}
          </form>

          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-sans text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Chat on WhatsApp
            </a>
          )}
        </Reveal>

        <Reveal delay={0.12} className="overflow-hidden rounded-2xl border border-border">
          {mapSrc ? (
            <iframe
              title={`Map of ${project.location}`}
              src={mapSrc}
              className="h-full min-h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-full min-h-80 items-center justify-center bg-background font-sans text-sm text-foreground-muted">
              Map unavailable
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
