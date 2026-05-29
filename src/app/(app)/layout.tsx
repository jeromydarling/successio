import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySession, getTokenFromCookie } from "@/lib/auth";
import { AppSidebar } from "@/components/app/app-sidebar";
import { MobileNavProvider } from "@/components/app/mobile-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Gate all authenticated app routes: a valid session cookie is required.
  let authed = false;
  try {
    const { env } = await getCloudflareContext();
    const e = env as unknown as { JWT_SECRET: string };
    const cookieStore = await cookies();
    const token = getTokenFromCookie(`session=${cookieStore.get("session")?.value ?? ""}`);
    const session = token ? await verifySession(token, e.JWT_SECRET) : null;
    authed = !!session;
  } catch {
    authed = false;
  }
  if (!authed) redirect("/login");

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </MobileNavProvider>
  );
}
