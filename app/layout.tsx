import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { Header } from "@/components/layout/Header";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://booteshomes.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bootes Homes | Home Builder in Noida",
    template: "%s",
  },
  description:
    "Bootes Homes builds premium custom homes in Noida. See our first completed project in Sector 20, Noida, built from foundation to finish.",
  keywords: [
    "home builder Noida",
    "construction company Noida",
    "construction company Noida Sector 20",
    "custom home builder Noida",
    "Bootes Homes",
  ],
  openGraph: {
    type: "website",
    siteName: "Bootes Homes",
    locale: "en_IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <Header />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
