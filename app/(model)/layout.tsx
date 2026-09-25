import type { ReactNode } from "react";
import { ModelLoader } from "@/components/providers/ModelLoader";
import { LoadingScreen } from "@/components/loading/LoadingScreen";

/**
 * Wraps only the routes that actually use the 3D house model (Home and
 * /projects/[slug]) so the load-progress screen never blocks
 * pages that don't need it (About, Contact, Technology, the /projects listing).
 */
export default function ModelRouteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ModelLoader />
      <LoadingScreen />
      {children}
    </>
  );
}
