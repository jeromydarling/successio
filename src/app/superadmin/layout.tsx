import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { timingSafeEqual } from "@/lib/timing-safe-equal";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getSaToken(): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext();
    return (env as { SUPER_ADMIN_TOKEN?: string }).SUPER_ADMIN_TOKEN;
  } catch {
    return process.env.SUPER_ADMIN_TOKEN;
  }
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const saToken = cookieStore.get("sa_token")?.value;
  const expected = await getSaToken();

  const authed = expected && saToken && timingSafeEqual(saToken, expected);
  if (!authed) redirect("/superadmin/login");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
          Successio Admin
        </span>
        <Link
          href="/superadmin"
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Customers
        </Link>
        <Link
          href="/superadmin/map"
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Map
        </Link>
        <div className="ml-auto">
          <a
            href="/superadmin/logout"
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Sign out
          </a>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
