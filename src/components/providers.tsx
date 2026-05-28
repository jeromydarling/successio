"use client";

import { MotionConfig } from "framer-motion";
import { QueryProvider } from "./query-provider";

/**
 * App-wide client providers.
 * - MotionConfig: honors OS "reduce motion" setting for all Framer animations.
 * - QueryProvider: tRPC + Tanstack Query with shared QueryClient.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <QueryProvider>{children}</QueryProvider>
    </MotionConfig>
  );
}
