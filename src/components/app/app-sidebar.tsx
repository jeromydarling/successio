"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  Mic,
  History,
  BookOpen,
  FileText,
  Settings,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc-client";
import { useMobileNav } from "./mobile-nav";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/vault", label: "Document Vault", icon: FolderOpen },
  { href: "/knowledge", label: "Knowledge", icon: Mic },
  { href: "/history", label: "History", icon: History },
  { href: "/legacy", label: "Legacy Book", icon: BookOpen },
  { href: "/profile", label: "Deal Room", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { open, setOpen } = useMobileNav();

  return (
    <>
      {/* Desktop: persistent sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-edge bg-canvas-soft/40 md:flex">
        <SidebarBody />
      </aside>

      {/* Mobile: slide-in drawer + backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-edge bg-canvas shadow-2xl">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

/** The shared sidebar contents — logo, nav, readiness chip. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: assoc } = trpc.config.association.useQuery(undefined, {
    staleTime: Infinity,
  });

  return (
    <>
      {/* Logo / white-label branding */}
      <div className="flex items-center gap-2.5 border-b border-edge px-5 py-5">
        {assoc?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assoc.logoUrl} alt={assoc.name} className="size-8 rounded-lg object-contain" />
        ) : (
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/30"
            style={assoc?.isConfigured ? { backgroundColor: `${assoc.primaryColor}1a`, boxShadow: `inset 0 0 0 1px ${assoc.primaryColor}55` } : undefined}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none">
              <path d="M8 14a4 4 0 1 1 8 0" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 14v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="6" r="2.5" fill="#fbbf24" />
            </svg>
          </span>
        )}
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{assoc?.name ?? "Successio"}</span>
          {assoc?.isConfigured && (
            <span className="block truncate text-[10px] text-ink-faint">on Successio</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-amber/10 text-amber-bright"
                      : "text-ink-soft hover:bg-white/[0.04] hover:text-ink"
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active ? "text-amber" : "")} />
                  {item.label}
                  {active && (
                    <ChevronRight className="ml-auto size-3.5 text-amber/60" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Readiness score chip */}
      <ReadinessChip />
    </>
  );
}

function ReadinessChip() {
  return (
    <div className="border-t border-edge p-4">
      <div className="rounded-xl border border-edge bg-canvas p-3">
        <div className="flex items-center justify-between text-xs text-ink-soft">
          <span>Sale Readiness</span>
          <span className="font-mono font-semibold text-amber-bright">—</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-0 rounded-full bg-gradient-to-r from-amber to-amber-bright" />
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">Open the dashboard for your live score</p>
      </div>
    </div>
  );
}
