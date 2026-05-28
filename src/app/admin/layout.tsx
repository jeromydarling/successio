/**
 * Server-side guard for the association admin portal.
 * Non-admins are redirected before the page renders — the client-side tRPC
 * calls (adminProcedure) re-verify the role on every request as well.
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

  if (!session || session.role !== "association_admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
