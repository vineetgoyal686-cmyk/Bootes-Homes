import Image from "next/image";
import { media } from "@/lib/media";

const ASPECT = { full: 1232 / 374, mark: 340 / 374 };

interface LogoProps {
  variant?: "full" | "mark";
  height?: number;
  className?: string;
  priority?: boolean;
}

/** Real Bootes Homes logo (public/logo/, matted to transparent PNG from the
 * client-supplied Logo.jpeg). `variant="mark"` is just the "B" for tight
 * spaces (loading screen, mobile header). */
export function Logo({ variant = "full", height = 32, className = "", priority }: LogoProps) {
  const width = Math.round(height * ASPECT[variant]);
  return (
    <Image
      src={variant === "full" ? media.logo.full() : media.logo.mark()}
      alt="Bootes Homes"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
