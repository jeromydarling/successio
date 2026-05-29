"use client";

import { createContext, useContext, useState } from "react";

/** Shared open/close state for the mobile nav drawer (toggle lives in the top
 * bar, the drawer lives in the sidebar). Defaults make it a no-op if a consumer
 * is ever rendered outside the provider. */
const MobileNavContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export const useMobileNav = () => useContext(MobileNavContext);
