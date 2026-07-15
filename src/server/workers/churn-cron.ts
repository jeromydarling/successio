/**
 * Churn prevention cron — runs daily via Cloudflare Scheduled Trigger.
 * Identifies at-risk organizations (score ≥ 2 on 4 signals) and sends a
 * targeted re-engagement email to the account owner.
 *
 * Signals (each +1 to risk score):
 *   A. No team login in the last 7 days
 *   B. Readiness score unchanged for 14+ days
 *   C. No document upload in 14+ days
 *   D. Profile created but never shared with anyone
 *
 * De-duplication: won't re-email an org until 7 days after the last send.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and, sql, isNull, isNotNull } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getEmailSender } from "@/lib/email/sender";
import { reEngagementEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";

export interface ChurnEnv {
  DB: D1Database;
  EMAIL?: { send: (m: unknown) => Promise<{ messageId?: string }> };
  EMAIL_FROM?: string;
  APP_URL?: string;
  ENVIRONMENT?: string;
}

export async function runChurnCron(env: ChurnEnv, ctx?: ExecutionContext): Promise<void> {
  const db = drizzle(env.DB, { schema });
  const nowSec = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = nowSec - 7 * 86400;
  const fourteenDaysAgo = nowSec - 14 * 86400;
  const base = appUrl(env);
  const sender = getEmailSender(env as Parameters<typeof getEmailSender>[0]);

  // Signal A: orgs where the most-recent session is > 7 days ago (or never).
  const signalARows = await db
    .all<{ org_id: string }>(
      sql`
        SELECT u.org_id
        FROM users u
        LEFT JOIN sessions s ON s.user_id = u.id
        WHERE u.role = 'owner'
        GROUP BY u.org_id
        HAVING MAX(s.created_at) IS NULL OR MAX(s.created_at) < ${sevenDaysAgo}
      `
    );
  const signalA = new Set(signalARows.map((r) => r.org_id));

  // Signal B: orgs where the most-recent score snapshot is > 14 days ago.
  const signalBRows = await db
    .all<{ org_id: string }>(
      sql`
        SELECT org_id
        FROM readiness_scores
        GROUP BY org_id
        HAVING MAX(created_at) < ${fourteenDaysAgo}
      `
    );
  const signalB = new Set(signalBRows.map((r) => r.org_id));

  // Signal C: orgs where the most-recent document is > 14 days ago.
  const signalCRows = await db
    .all<{ org_id: string }>(
      sql`
        SELECT org_id
        FROM documents
        GROUP BY org_id
        HAVING MAX(created_at) < ${fourteenDaysAgo}
      `
    );
  const signalC = new Set(signalCRows.map((r) => r.org_id));

  // Signal D: orgs that have a published profile but zero share tokens.
  const signalDRows = await db
    .all<{ org_id: string }>(
      sql`
        SELECT bp.org_id
        FROM business_profiles bp
        LEFT JOIN share_tokens st ON st.org_id = bp.org_id
        WHERE bp.is_draft = 0 AND st.id IS NULL
      `
    );
  const signalD = new Set(signalDRows.map((r) => r.org_id));

  // All owner users + their org's churn gate timestamp.
  const owners = await db
    .select({
      orgId: schema.users.orgId,
      email: schema.users.email,
      name: schema.users.name,
      orgName: schema.organizations.name,
      churnEmailSentAt: schema.organizations.churnEmailSentAt,
      orgCreatedAt: schema.organizations.createdAt,
    })
    .from(schema.users)
    .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
    .where(eq(schema.users.role, "owner"))
    .all();

  let sent = 0;
  const sevenDaysAgoMs = sevenDaysAgo * 1000;

  for (const owner of owners) {
    const { orgId, email, name, orgName, churnEmailSentAt, orgCreatedAt } = owner;

    // Skip demo orgs.
    if (orgId.startsWith("demo-")) continue;

    // Skip orgs less than 14 days old — brand-new customers get onboarding,
    // not churn nags, and their login history hasn't accumulated yet.
    if (orgCreatedAt && orgCreatedAt.getTime() > nowSec * 1000 - 14 * 86400 * 1000) continue;

    const score =
      (signalA.has(orgId) ? 1 : 0) +
      (signalB.has(orgId) ? 1 : 0) +
      (signalC.has(orgId) ? 1 : 0) +
      (signalD.has(orgId) ? 1 : 0);

    if (score < 2) continue;

    // De-duplicate: skip if we emailed in the last 7 days.
    if (churnEmailSentAt && churnEmailSentAt.getTime() > sevenDaysAgoMs) continue;

    const signals: string[] = [];
    if (signalA.has(orgId)) signals.push("No team login in over a week");
    if (signalB.has(orgId)) signals.push("Sale readiness score hasn't changed in 2 weeks");
    if (signalC.has(orgId)) signals.push("No new documents uploaded in 2 weeks");
    if (signalD.has(orgId)) signals.push("Business profile created but never shared with buyers");

    try {
      const mail = reEngagementEmail({ name, orgName, signals, url: `${base}/dashboard` });
      await sender.send({ to: email, ...mail });
      await db
        .update(schema.organizations)
        .set({ churnEmailSentAt: new Date() })
        .where(eq(schema.organizations.id, orgId));
      sent++;
      console.info(`[churn-cron] emailed ${orgId} score=${score}`);
    } catch (err) {
      console.error(`[churn-cron] failed for ${orgId}:`, err);
    }
  }

  console.info(`[churn-cron] done — ${sent} emails sent`);

  // Piggyback: geocode org locations for the superadmin map. Runs here (once
  // a day, sequential, 1.1s apart per Nominatim's usage policy) instead of
  // inside a page request where it would add ~11s of latency.
  await geocodePendingOrgs(db);
}

/** Resolve lat/lng for up to 25 orgs that have a location but no coordinates. */
async function geocodePendingOrgs(db: ReturnType<typeof drizzle<typeof schema>>): Promise<void> {
  const pending = await db
    .select({ id: schema.organizations.id, location: schema.organizations.location })
    .from(schema.organizations)
    .where(
      and(
        isNotNull(schema.organizations.location),
        isNull(schema.organizations.lat)
      )
    )
    .limit(25)
    .all();

  let geocoded = 0;
  for (const org of pending) {
    try {
      const q = encodeURIComponent(org.location!);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        {
          headers: { "User-Agent": "Successio/1.0 (admin-crm; contact@successio.pro)" },
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data[0]) {
          await db
            .update(schema.organizations)
            .set({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
            .where(eq(schema.organizations.id, org.id));
          geocoded++;
        }
      }
    } catch {
      // Non-fatal — the org just stays un-plotted until the next run.
    }
    // Respect Nominatim's 1 req/sec rate limit.
    await new Promise((r) => setTimeout(r, 1100));
  }
  if (pending.length > 0) console.info(`[churn-cron] geocoded ${geocoded}/${pending.length} orgs`);
}
