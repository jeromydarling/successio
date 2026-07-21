/**
 * Deal-room view digest — runs daily alongside the churn cron. For each org
 * whose shared profile was viewed since the last digest, emails the owner a
 * one-a-day summary of who looked and how engaged they were. Per-view emails
 * would spam; a daily roll-up is the signal a seller actually wants.
 *
 * Opt-out via view_digest_opt_out (unsubscribe link in every digest).
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getEmailSender, type EmailEnv } from "@/lib/email/sender";
import { dealRoomDigestEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";

export type ViewDigestEnv = EmailEnv & { DB: D1Database; APP_URL?: string };

export async function runViewDigest(env: ViewDigestEnv): Promise<void> {
  const db = drizzle(env.DB, { schema });
  const nowSec = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = nowSec - 7 * 86400;
  const base = appUrl(env);
  const sender = getEmailSender(env);

  // Orgs that received any view in the last week — the only ones worth checking.
  const active = await db.all<{ org_id: string }>(
    sql`SELECT DISTINCT org_id FROM share_views WHERE created_at > ${sevenDaysAgo}`
  );

  let sent = 0;
  for (const { org_id: orgId } of active) {
    if (orgId.startsWith("demo-")) continue;

    const org = await db
      .select({
        name: schema.organizations.name,
        optOut: schema.organizations.viewDigestOptOut,
        digestSentAt: schema.organizations.viewDigestSentAt,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .get();
    if (!org || org.optOut) continue;

    // Views since the last digest (or the last 24h the first time).
    const cutoffSec = org.digestSentAt
      ? Math.floor(org.digestSentAt.getTime() / 1000)
      : nowSec - 86400;

    const views = await db.all<{
      viewer_name: string | null;
      viewer_email: string | null;
      tier: string | null;
      sections_viewed: string | null;
      duration_seconds: number | null;
    }>(
      sql`SELECT v.viewer_name, v.viewer_email, t.tier, v.sections_viewed, v.duration_seconds
          FROM share_views v
          LEFT JOIN share_tokens t ON t.id = v.token_id
          WHERE v.org_id = ${orgId} AND v.created_at > ${cutoffSec}
          ORDER BY v.created_at DESC
          LIMIT 50`
    );
    if (views.length === 0) continue;

    const owner = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, "owner")))
      .get();
    if (!owner?.email) continue;

    const mailViews = views.map((v) => {
      let sections: number | null = null;
      if (v.sections_viewed) {
        try {
          const arr = JSON.parse(v.sections_viewed) as unknown[];
          sections = Array.isArray(arr) ? arr.length : null;
        } catch { /* ignore */ }
      }
      return {
        viewer: v.viewer_name ?? v.viewer_email ?? "Anonymous visitor",
        tier: (v.tier ?? "teaser").replace("public", "teaser"),
        sections,
        durationSeconds: v.duration_seconds,
      };
    });

    try {
      const mail = dealRoomDigestEmail({
        name: owner.name,
        orgName: org.name,
        views: mailViews,
        url: `${base}/profile`,
        unsubscribeUrl: `${base}/api/email/unsubscribe?org=${orgId}&type=views`,
      });
      await sender.send({ to: owner.email, ...mail });
      await db
        .update(schema.organizations)
        .set({ viewDigestSentAt: new Date() })
        .where(eq(schema.organizations.id, orgId));
      sent++;
    } catch (err) {
      console.error(`[view-digest] failed for ${orgId}:`, err);
    }
  }

  console.info(`[view-digest] done — ${sent} digests sent`);
}
