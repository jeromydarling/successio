/**
 * POST /api/concierge — public intake for the done-for-you service. No
 * account required. Rate-limited, honeypot-guarded, Zod-validated. Links the
 * request to an existing org when the email belongs to an owner, confirms to
 * the requester, and notifies the team inbox.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";
import { nanoid } from "@/lib/nanoid";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";
import { getEmailSender } from "@/lib/email/sender";
import { conciergeReceivedEmail, conciergeTeamEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";
import { conciergeIntakeSchema } from "@/lib/concierge";

interface ConciergeEnv {
  DB: D1Database;
  SESSIONS?: KVNamespace;
  EMAIL?: { send: (m: unknown) => Promise<{ messageId?: string }> };
  EMAIL_FROM?: string;
  APP_URL?: string;
  CONCIERGE_INBOX?: string;
}

export async function POST(req: Request) {
  const env = (await getCloudflareContext()).env as unknown as ConciergeEnv;
  const db = drizzle(env.DB, { schema });

  // 3 requests per 10 minutes per IP — a human fills this once.
  if (env.SESSIONS) {
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    const { allowed } = await rateLimit(env.SESSIONS, `concierge:${await sha256Hex(ip)}`, 3, 600);
    if (!allowed) return Response.json({ error: "Too many requests — please try again shortly." }, { status: 429 });
  }

  const parsed = conciergeIntakeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the highlighted fields." }, { status: 400 });
  }
  const d = parsed.data;

  // Honeypot filled → pretend success, store nothing.
  if (d.website) return Response.json({ ok: true });

  const email = d.email.toLowerCase();
  const owner = await db
    .select({ orgId: schema.users.orgId })
    .from(schema.users)
    .where(and(eq(schema.users.email, email), eq(schema.users.role, "owner")))
    .get();

  const id = nanoid();
  await db.insert(schema.conciergeRequests).values({
    id,
    orgId: owner?.orgId ?? null,
    name: d.name,
    email,
    phone: d.phone || null,
    businessName: d.businessName,
    vertical: d.vertical,
    location: d.location || null,
    hasPaper: d.hasPaper,
    hasDigital: d.hasDigital,
    hasQuickbooks: d.hasQuickbooks,
    timeline: d.timeline,
    notes: d.notes || null,
  });

  // Emails are best-effort — the row is already saved. E2E fixtures skip the
  // team notification so CI runs don't page a human.
  const sender = getEmailSender(env as Parameters<typeof getEmailSender>[0]);
  const isFixture = email.startsWith("e2e+");
  try {
    await sender.send({ to: email, ...conciergeReceivedEmail({ name: d.name }) });
  } catch (err) {
    console.error("[concierge] requester confirmation failed:", err);
  }
  if (!isFixture && env.CONCIERGE_INBOX) {
    try {
      await sender.send({
        to: env.CONCIERGE_INBOX,
        ...conciergeTeamEmail({
          ...d,
          email,
          hasAccount: !!owner,
          adminUrl: `${appUrl(env)}/superadmin/concierge`,
        }),
      });
    } catch (err) {
      console.error("[concierge] team notification failed:", err);
    }
  }

  return Response.json({ ok: true, id });
}
