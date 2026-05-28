"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

export function AppTopNav({ title }: { title?: string }) {
  const router = useRouter();
  const { data: me } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: (data) => {
      document.cookie = data.cookie;
      router.push("/login");
    },
  });

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge px-6">
      <h1 className="text-sm font-semibold text-ink">{title}</h1>
      <div className="flex items-center gap-2">
        <button className="flex size-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/[0.04] hover:text-ink-soft">
          <Bell className="size-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-edge px-2.5 py-1">
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
