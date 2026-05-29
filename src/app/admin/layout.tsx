/**
 * Server-side guard for the association portal. Requires a valid session;
 * non-admins land on the onboarding view (create an association) rather than
 * being bounced, and the tRPC adminProcedure re-verifies the role on every
 * data call.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  let secret: string | undefined;
  try {
    const ctx = await getCloudflareContext({ async: true });
    secret = (ctx.env as unknown as { JWT_SECRET?: string }).JWT_SECRET;
  } catch {
    secret = process.env.JWT_SECRET;
  }

  const session = token && secret ? await verifySession(token, secret) : null;
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-edge">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/30">
              <svg viewBox="0 0 24 24" className="size-4" fill="none">
                <path d="M8 14a4 4 0 1 1 8 0" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 14v6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="6" r="2.5" fill="#fbbf24" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-ink">Successio · Association portal</span>
          </a>
          <a href="/dashboard" className="text-sm text-ink-soft transition-colors hover:text-ink">
            My business →
          </a>
        </div>
      </div>
      {children}
    </div>
  );
}
