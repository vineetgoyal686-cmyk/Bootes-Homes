import { NextResponse } from "next/server";

interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  message: string;
}

function isValidPayload(body: unknown): body is ContactPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === "string" &&
    b.name.trim().length > 0 &&
    typeof b.phone === "string" &&
    b.phone.trim().length > 0 &&
    typeof b.email === "string" &&
    b.email.includes("@") &&
    typeof b.message === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Please fill in your name, phone, email and message." },
      { status: 400 }
    );
  }

  const { name, phone, email, message } = body;
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (!apiKey) {
    // No key configured (local dev / not yet set up in production) - log
    // instead of silently dropping the enquiry.
    console.log("[contact] RESEND_API_KEY not set, logging enquiry instead of emailing:", {
      name,
      phone,
      email,
      message,
    });
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Bootes Homes Website <onboarding@resend.dev>",
      to: toEmail ? [toEmail] : ["onboarding@resend.dev"],
      replyTo: email,
      subject: `New enquiry from ${name}`,
      text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\n${message}`,
    });
    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[contact] Failed to send email:", err);
    return NextResponse.json({ error: "Couldn't send your message. Please try again." }, { status: 502 });
  }
}
