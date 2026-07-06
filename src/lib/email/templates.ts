/**
 * Transactional email templates. Each returns { subject, html, text }.
 * Plain, dignified, on-brand (amber accent, slate ink) — no marketing fluff.
 */

import type { EmailMessage } from "./sender";

type Built = Pick<EmailMessage, "subject" | "html" | "text">;

const BRAND = "Successio";
const AMBER = "#f59e0b";
const INK = "#0f172a";
const SOFT = "#475569";

/** Wrap body HTML in a simple, email-client-safe shell. */
function layout(opts: { heading: string; bodyHtml: string; footer?: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="padding:28px 32px 8px;">
        <div style="font-weight:700;font-size:18px;color:${INK};letter-spacing:-0.01em;">${BRAND}</div>
      </td></tr>
      <tr><td style="padding:8px 32px 4px;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;color:${INK};">${opts.heading}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 28px;color:${SOFT};font-size:15px;line-height:1.6;">
        ${opts.bodyHtml}
      </td></tr>
    </table>
    <div style="max-width:520px;color:#94a3b8;font-size:12px;line-height:1.5;padding:16px 8px;text-align:center;">
      ${opts.footer ?? `${BRAND} — helping owners pass the torch.`}
    </div>
  </td></tr></table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${AMBER};color:#1a1206;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>`;
}

export function passwordResetEmail(opts: { name?: string; url: string }): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  return {
    subject: "Reset your Successio password",
    html: layout({
      heading: "Reset your password",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 20px;">We received a request to reset your password. Click below to choose a new one. This link expires in 1 hour.</p>
        <p style="margin:0 0 24px;">${button(opts.url, "Reset password")}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
    }),
    text: `${hi}\n\nWe received a request to reset your Successio password. Open this link to choose a new one (expires in 1 hour):\n\n${opts.url}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function verifyEmail(opts: { name?: string; url: string }): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Welcome,";
  return {
    subject: "Confirm your Successio email",
    html: layout({
      heading: "Confirm your email address",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 20px;">Please confirm this email address to finish setting up your account.</p>
        <p style="margin:0 0 24px;">${button(opts.url, "Confirm email")}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">This link expires in 24 hours.</p>`,
    }),
    text: `${hi}\n\nConfirm your Successio email address to finish setting up your account (link expires in 24 hours):\n\n${opts.url}`,
  };
}

export function associationInviteEmail(opts: {
  associationName: string;
  businessName: string;
  url: string;
}): Built {
  return {
    subject: `${opts.associationName} invited you to Successio`,
    html: layout({
      heading: `${opts.associationName} invited you`,
      bodyHtml: `<p style="margin:0 0 20px;">${opts.associationName} uses Successio to help member businesses document their operations and prepare for a successful ownership transition — and they've invited <strong>${opts.businessName}</strong> to join.</p>
        <p style="margin:0 0 24px;">${button(opts.url, "Accept your invitation")}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">Setting up takes a few minutes. Your information stays private to you unless you choose to share it.</p>`,
    }),
    text: `${opts.associationName} invited ${opts.businessName} to join Successio — a tool to document your operations and prepare for ownership transition.\n\nAccept your invitation:\n\n${opts.url}`,
  };
}

export function reEngagementEmail(opts: {
  name?: string;
  orgName: string;
  signals: string[];
  url: string;
}): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  const bullets = opts.signals
    .map((s) => `<li style="margin-bottom:8px;">${s}</li>`)
    .join("");
  return {
    subject: `${opts.orgName}: your sale readiness needs attention`,
    html: layout({
      heading: "Don't lose your progress",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 16px;">A few things on <strong>${opts.orgName}</strong> need your attention:</p>
        <ul style="margin:0 0 20px;padding-left:20px;">${bullets}</ul>
        <p style="margin:0 0 24px;">${button(opts.url, "Return to Successio")}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">You're receiving this because you have a Successio account. Reply to unsubscribe.</p>`,
    }),
    text: `${hi}\n\nA few things on ${opts.orgName} need your attention:\n${opts.signals.map((s) => `- ${s}`).join("\n")}\n\nReturn to Successio:\n${opts.url}`,
  };
}

export function processingCompleteEmail(opts: {
  name?: string;
  orgName: string;
  documentCount: number;
  score?: number;
  url: string;
}): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  const scoreLine =
    typeof opts.score === "number"
      ? `<p style="margin:0 0 20px;">Your Sale Readiness score is now <strong style="color:${INK};">${opts.score}/100</strong>.</p>`
      : "";
  const scoreText = typeof opts.score === "number" ? `Your Sale Readiness score is now ${opts.score}/100.\n\n` : "";
  const docs = `${opts.documentCount} document${opts.documentCount === 1 ? "" : "s"}`;
  return {
    subject: `${opts.orgName}: documents processed`,
    html: layout({
      heading: "Your documents are ready",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 20px;">We finished processing ${docs} for ${opts.orgName}. The extracted details and your updated checklist are on your dashboard.</p>
        ${scoreLine}
        <p style="margin:0 0 24px;">${button(opts.url, "View your dashboard")}</p>`,
    }),
    text: `${hi}\n\nWe finished processing ${docs} for ${opts.orgName}. ${scoreText}View your dashboard:\n\n${opts.url}`,
  };
}
