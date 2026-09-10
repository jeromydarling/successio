import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isMarketplaceOpen, type MarketplaceEnv } from "@/lib/marketplace";

/**
 * Hidden until there is real inventory: 404 for everyone except a signed-in
 * superadmin (preview), and never indexed. Flip MARKETPLACE_ENABLED to "on"
 * to open it — and update robots.ts at the same time.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketplace",
  robots: { index: false, follow: false, nocache: true },
};

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  let env: MarketplaceEnv = {};
  try {
    env = (await getCloudflareContext()).env as unknown as MarketplaceEnv;
  } catch {
    env = { MARKETPLACE_ENABLED: process.env.MARKETPLACE_ENABLED, SUPER_ADMIN_TOKEN: process.env.SUPER_ADMIN_TOKEN };
  }
  const cookieStore = await cookies();
  const sa = cookieStore.get("sa_token")?.value;
  const open = await isMarketplaceOpen(env, sa ? `sa_token=${sa}` : null);
  if (!open) notFound();

  return (
    <div className="min-h-screen bg-canvas">
      {env.MARKETPLACE_ENABLED !== "on" && (
        <div className="border-b border-amber/30 bg-amber/[0.06] px-4 py-2 text-center text-xs text-amber">
          Private preview — the marketplace is hidden from the public until there is real inventory.
        </div>
      )}
      {children}
    </div>
  );
}
