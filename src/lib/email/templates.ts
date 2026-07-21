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

export function welcomeEmail(opts: { name?: string; url: string; verifyUrl?: string }): Built {
  const hi = opts.name ? `Welcome, ${opts.name}.` : "Welcome.";
  const verifyBlock = opts.verifyUrl
    ? `<p style="margin:20px 0 8px;">First, please confirm your email so account recovery works:</p>
       <p style="margin:0 0 24px;">${button(opts.verifyUrl, "Confirm email")}</p>`
    : `<p style="margin:20px 0 24px;">${button(opts.url, "Open your dashboard")}</p>`;
  return {
    subject: "Welcome to Successio — let's get your business documented",
    html: layout({
      heading: "Your business, made ready to hand off",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 12px;">Successio turns the paperwork and know-how of your business into something a buyer, a lender, or your own crew can actually understand. Here's the fastest start:</p>
        <ol style="margin:0 0 8px;padding-left:20px;">
          <li style="margin-bottom:6px;"><strong>Upload a few documents</strong> — a customer list, last year's P&amp;L, an equipment list. Snap photos of paper right from your phone.</li>
          <li style="margin-bottom:6px;"><strong>Record what's in your head</strong> — answer one question out loud and it becomes a written procedure.</li>
          <li style="margin-bottom:6px;"><strong>Watch your Sale Readiness Score climb</strong> — and generate a buyer-ready profile when you're set.</li>
        </ol>
        ${verifyBlock}
        <p style="margin:0;color:#94a3b8;font-size:13px;">Not sure where to start? The <a href="${opts.url.replace(/\/dashboard.*$/, "")}/help/getting-started" style="color:${AMBER};">first-30-minutes guide</a> walks you through it.</p>`,
    }),
    text: `${hi}\n\nSuccessio turns your business's paperwork and know-how into something a buyer or lender can understand.\n\nStart here:\n1. Upload a few documents (customer list, P&L, equipment list) — photos of paper work too\n2. Record what's in your head — it becomes a written procedure\n3. Watch your Sale Readiness Score climb, then generate a buyer profile\n\n${opts.verifyUrl ? `Confirm your email: ${opts.verifyUrl}\n\n` : ""}Open your dashboard: ${opts.url}`,
  };
}

export function passwordChangedEmail(opts: { name?: string; resetUrl: string }): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  return {
    subject: "Your Successio password was changed",
    html: layout({
      heading: "Your password was changed",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 16px;">Your Successio password was just changed, and every other signed-in device has been signed out.</p>
        <p style="margin:0 0 20px;color:${INK};"><strong>If this was you</strong>, no action is needed.</p>
        <p style="margin:0 0 8px;"><strong>If this wasn't you</strong>, reset your password immediately and contact us:</p>
        <p style="margin:0 0 24px;">${button(opts.resetUrl, "Reset your password")}</p>`,
    }),
    text: `${hi}\n\nYour Successio password was just changed, and every other device has been signed out.\n\nIf this was you, no action is needed.\n\nIf this wasn't you, reset your password immediately: ${opts.resetUrl}`,
  };
}

export function processingFailedEmail(opts: {
  name?: string;
  orgName: string;
  documentName: string;
  url: string;
}): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  const safeName = opts.documentName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return {
    subject: `A document couldn't be processed for ${opts.orgName}`,
    html: layout({
      heading: "One of your documents needs another try",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 16px;">We couldn't finish processing <strong>${safeName}</strong>. This usually means the file was hard to read — a blurry scan, an unusual format, or a corrupted export.</p>
        <p style="margin:0 0 8px;">Open your vault to retry it, or re-upload a clearer copy:</p>
        <p style="margin:0 0 24px;">${button(opts.url, "Open your Document Vault")}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">Nothing else was affected — your other documents processed normally.</p>`,
    }),
    text: `${hi}\n\nWe couldn't finish processing "${opts.documentName}" for ${opts.orgName}. This usually means the file was hard to read.\n\nOpen your vault to retry or re-upload a clearer copy:\n${opts.url}`,
  };
}

export function documentRequestResolvedEmail(opts: {
  requesterName?: string;
  orgName: string;
  status: "fulfilled" | "declined";
}): Built {
  const hi = opts.requesterName ? `Hi ${opts.requesterName},` : "Hi,";
  const fulfilled = opts.status === "fulfilled";
  return {
    subject: fulfilled
      ? `${opts.orgName} responded to your document request`
      : `Update on your request to ${opts.orgName}`,
    html: layout({
      heading: fulfilled ? "Your document request was accepted" : "Update on your request",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        ${
          fulfilled
            ? `<p style="margin:0 0 16px;">The owner of <strong>${opts.orgName}</strong> has accepted your document request and will send the materials to you directly by email. Keep an eye on your inbox.</p>`
            : `<p style="margin:0 0 16px;">The owner of <strong>${opts.orgName}</strong> reviewed your document request and isn't able to share those materials right now. You're welcome to reach out to them directly to discuss.</p>`
        }
        <p style="margin:0;color:#94a3b8;font-size:13px;">This message was sent because you requested documents through a Successio deal room.</p>`,
    }),
    text: `${hi}\n\n${
      fulfilled
        ? `The owner of ${opts.orgName} has accepted your document request and will send the materials directly by email.`
        : `The owner of ${opts.orgName} reviewed your request and isn't able to share those materials right now.`
    }`,
  };
}

export function dealRoomDigestEmail(opts: {
  name?: string;
  orgName: string;
  views: Array<{ viewer: string; tier: string; sections: number | null; durationSeconds: number | null }>;
  url: string;
  unsubscribeUrl: string;
}): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  const rows = opts.views
    .map((v) => {
      const engagement =
        [
          v.sections ? `${v.sections} section${v.sections > 1 ? "s" : ""}` : null,
          v.durationSeconds
            ? v.durationSeconds >= 60
              ? `${Math.round(v.durationSeconds / 60)}m`
              : `${v.durationSeconds}s`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "opened";
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <strong style="color:${INK};">${v.viewer.replace(/</g, "&lt;")}</strong>
        <span style="color:#94a3b8;"> · ${v.tier} · ${engagement}</span></td></tr>`;
    })
    .join("");
  const n = opts.views.length;
  return {
    subject: `${n} ${n === 1 ? "person" : "people"} viewed ${opts.orgName}'s profile`,
    html: layout({
      heading: n === 1 ? "Someone viewed your business profile" : "People are viewing your business profile",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 12px;">Here's who looked at your deal room in the last day:</p>
        <table role="presentation" width="100%" style="margin:0 0 20px;">${rows}</table>
        <p style="margin:0 0 24px;">${button(opts.url, "See the full access log")}</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;">You're getting this because someone viewed your shared profile. <a href="${opts.unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Turn off view notifications</a>.</p>`,
    }),
    text: `${hi}\n\nWho viewed ${opts.orgName}'s deal room in the last day:\n${opts.views
      .map((v) => `- ${v.viewer} (${v.tier})`)
      .join("\n")}\n\nSee the full access log: ${opts.url}\n\nTurn off view notifications: ${opts.unsubscribeUrl}`,
  };
}

export function inviteAcceptedEmail(opts: {
  adminName?: string;
  businessName: string;
  associationName: string;
  url: string;
}): Built {
  const hi = opts.adminName ? `Hi ${opts.adminName},` : "Hi,";
  return {
    subject: `${opts.businessName} joined ${opts.associationName} on Successio`,
    html: layout({
      heading: "A member accepted your invitation",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 20px;"><strong>${opts.businessName.replace(/</g, "&lt;")}</strong> just created a Successio account through your association's invite. They'll appear in your member roster as they build out their business record.</p>
        <p style="margin:0 0 24px;">${button(opts.url, "Open your association portal")}</p>`,
    }),
    text: `${hi}\n\n${opts.businessName} just joined ${opts.associationName} on Successio through your invite. They'll appear in your member roster.\n\nOpen your portal: ${opts.url}`,
  };
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
  unsubscribeUrl: string;
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
        <p style="margin:0;color:#94a3b8;font-size:13px;">You're receiving this because you have a Successio account.
        <a href="${opts.unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from reminder emails</a>.</p>`,
    }),
    text: `${hi}\n\nA few things on ${opts.orgName} need your attention:\n${opts.signals.map((s) => `- ${s}`).join("\n")}\n\nReturn to Successio:\n${opts.url}\n\nUnsubscribe from reminder emails: ${opts.unsubscribeUrl}`,
  };
}

export function shareVerificationEmail(opts: {
  code: string;
  orgName: string;
}): Built {
  return {
    subject: `${opts.code} is your verification code`,
    html: layout({
      heading: "Verify your email to continue",
      bodyHtml: `<p style="margin:0 0 16px;">You asked to view the confidential business profile for <strong>${opts.orgName}</strong>.</p>
        <p style="margin:0 0 8px;">Enter this code on the page to continue:</p>
        <p style="margin:0 0 20px;font-size:32px;letter-spacing:8px;font-weight:700;color:${INK};font-family:ui-monospace,monospace;">${opts.code}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">The code expires in 15 minutes. If you didn't request this, you can ignore this email — nothing is shared without the code.</p>`,
    }),
    text: `You asked to view the confidential business profile for ${opts.orgName}.\n\nYour verification code: ${opts.code}\n\nThe code expires in 15 minutes. If you didn't request this, ignore this email — nothing is shared without the code.`,
  };
}

export function documentRequestEmail(opts: {
  name?: string;
  orgName: string;
  requesterName: string;
  requesterEmail: string;
  requestText: string;
  url: string;
}): Built {
  const hi = opts.name ? `Hi ${opts.name},` : "Hi,";
  const safeRequest = opts.requestText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return {
    subject: `A buyer requested documents from ${opts.orgName}`,
    html: layout({
      heading: "New document request",
      bodyHtml: `<p style="margin:0 0 16px;">${hi}</p>
        <p style="margin:0 0 16px;"><strong>${opts.requesterName}</strong> (${opts.requesterEmail}) viewed your deal room and asked for:</p>
        <blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid ${AMBER};background:#fffbeb;color:${INK};border-radius:0 8px 8px 0;">${safeRequest}</blockquote>
        <p style="margin:0 0 8px;color:${SOFT};">Nothing is shared automatically — review the request and decide what to send.</p>
        <p style="margin:0 0 24px;">${button(opts.url, "Review in your Deal Room")}</p>`,
    }),
    text: `${hi}\n\n${opts.requesterName} (${opts.requesterEmail}) viewed your deal room and asked for:\n\n"${opts.requestText}"\n\nNothing is shared automatically — review the request and decide what to send:\n${opts.url}`,
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
