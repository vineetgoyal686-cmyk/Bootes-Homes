"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max additional tilt on hover, in degrees. */
  maxTilt?: number;
  /** Resting rotateY, in degrees - this is what makes the card read as 3D
   * even before the user touches it, not just as a hover trick. */
  baseRotateY?: number;
}

/** A card sitting at a persistent 3D angle (perspective + rotateY), which
 * tilts further toward the cursor on hover and eases back to its resting
 * angle on leave - not flat until interacted with. Pure CSS transforms, no
 * WebGL canvas. No-ops under prefers-reduced-motion (renders flat). */
export function TiltCard({ children, className = "", maxTilt = 8, baseRotateY = 0 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  function setTransform(rotateX: number, rotateY: number) {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0px)`;
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(-py * maxTilt, baseRotateY + px * maxTilt);
  }

  function handleMouseLeave() {
    setTransform(0, baseRotateY);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d] ${className}`}
      style={{ transform: reducedMotion ? undefined : `perspective(1000px) rotateY(${baseRotateY}deg)` }}
    >
      {children}
    </div>
  );
}
