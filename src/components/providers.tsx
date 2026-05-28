"use client";

import { MotionConfig } from "framer-motion";

/**
 * App-wide client providers. `reducedMotion="user"` makes every Framer Motion
 * animation honor the OS "reduce motion" setting automatically.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
