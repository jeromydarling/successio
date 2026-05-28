import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas">
      {/* Subtle grid backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-amber/[0.06] blur-[120px]" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/30">
              <svg viewBox="0 0 24 24" className="size-5" fill="none">
                <path d="M8 14a4 4 0 1 1 8 0" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 14v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="6" r="2.5" fill="#fbbf24" />
              </svg>
            </span>
            <span className="text-lg font-semibold text-ink">Successio</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
