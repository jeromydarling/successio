"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "./motion-primitives";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#timeline", label: "The story" },
  { href: "#verticals", label: "Trades" },
  { href: "/history", label: "Live demo" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 transition-all duration-300",
          scrolled
            ? "mt-3 rounded-full border border-edge bg-canvas/70 py-2.5 backdrop-blur-xl"
            : "mt-0 border border-transparent py-5"
        )}
        style={scrolled ? { maxWidth: "64rem" } : undefined}
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-semibold tracking-tight text-ink">
            Successio
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm text-ink-soft transition-colors hover:bg-white/[0.04] hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Magnetic strength={0.4}>
            <Button size="sm">Start the profile</Button>
          </Magnetic>
        </div>

        <button
          className="text-ink md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 overflow-hidden rounded-2xl border border-edge bg-canvas/95 p-3 backdrop-blur-xl md:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm text-ink-soft hover:bg-white/[0.04] hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <div className="p-2">
              <Button size="sm" className="w-full">
                Start the profile
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Logo() {
  return (
    <span className="relative flex size-8 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/30">
      {/* Stylized torch being passed — two interlocking arcs */}
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M8 14a4 4 0 1 1 8 0"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M12 14v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="6" r="2.5" fill="#fbbf24" className="float-slow" />
      </svg>
    </span>
  );
}
