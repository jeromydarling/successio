"use client";

import { Bell, LogOut, User, Menu } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { useMobileNav } from "./mobile-nav";

export function AppTopNav({ title }: { title?: string }) {
  const { data: me } = trpc.auth.me.useQuery();
  const { setOpen } = useMobileNav();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Server clears the cookie (Set-Cookie); full reload drops cached state.
      window.location.href = "/login";
    },
  });

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-edge px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate text-sm font-semibold text-ink">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/[0.04] hover:text-ink-soft">
          <Bell className="size-4" />
        </button>
        <div className="hidden items-center gap-2 rounded-full border border-edge px-2.5 py-1 sm:flex">
          <User className="size-3.5 text-ink-faint" />
          <span className="font-mono text-xs text-ink-soft">{me?.email ?? "—"}</span>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          className="flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/[0.04] hover:text-ink-soft"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
