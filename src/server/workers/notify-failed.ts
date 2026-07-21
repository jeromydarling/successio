/**
 * Notify a business owner that one of their documents failed to process.
 * Called from the two failure surfaces — the workflow's catch block (a step
 * exhausted its retries) and the dead-letter queue (delivery/create failed).
 * Always best-effort: a notification failure must never mask the original
 * processing failure.
 */

import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { getEmailSender, type EmailEnv } from "@/lib/email/sender";
import { processingFailedEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/app-url";

export async function notifyProcessingFailed(
  env: EmailEnv & { DB: D1Database; APP_URL?: string },
  documentId: string
): Promise<void> {
  try {
    const db = drizzle(env.DB, { schema });
    const doc = await db
      .select({ orgId: schema.documents.orgId, originalName: schema.documents.originalName })
      .from(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .get();
    if (!doc) return;

    const [owner, org] = await Promise.all([
      db
        .select({ name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, doc.orgId), eq(schema.users.role, "owner")))
        .get(),
      db
        .select({ name: schema.organizations.name })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, doc.orgId))
        .get(),
    ]);
    if (!owner?.email) return;

    const mail = processingFailedEmail({
      name: owner.name,
      orgName: org?.name ?? "your business",
      documentName: doc.originalName,
      url: `${appUrl(env)}/vault`,
    });
    await getEmailSender(env).send({ to: owner.email, ...mail });
  } catch (err) {
    console.error("[notify-failed] could not send failure email:", err);
  }
}
