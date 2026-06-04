/**
 * Email sending — provider-agnostic interface + drivers.
 *
 * The whole app sends through `getEmailSender(env).send(msg)`. Drivers, in
 * preference order:
 *   1. BindingEmailSender — Cloudflare Email Sending via the native Workers
 *      binding (`env.EMAIL`). No secrets at all. successio.pro is onboarded, so
 *      it can send from @successio.pro to any recipient.
 *   2. CloudflareRestEmailSender — same product via REST (needs a CF API token
 *      with Email Sending:Edit). Fallback for non-binding contexts.
 *   3. ConsoleEmailSender — logs instead of sending, so flows never hard-fail
 *      when nothing is configured (e.g. local dev).
 *
 * Swapping providers (e.g. Resend) is just another EmailSender implementation.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Defaults to the configured from-address. */
  from?: string;
  replyTo?: string;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<void>;
}

/** Minimal shape of the Cloudflare Email Sending binding (env.EMAIL). */
interface SendEmailBinding {
  send(message: {
    from: string | { email: string; name?: string };
    to: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | { email: string; name?: string };
  }): Promise<{ messageId?: string }>;
}

export interface EmailEnv {
  EMAIL?: SendEmailBinding;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  EMAIL_FROM?: string; // e.g. "Successio <noreply@successio.pro>"
  ENVIRONMENT?: string;
}

const DEFAULT_FROM = "Successio <noreply@successio.pro>";

/** Cloudflare Email Sending via the native Workers binding — no secrets. */
export class BindingEmailSender implements EmailSender {
  constructor(private binding: SendEmailBinding, private from: string) {}

  async send(msg: EmailMessage): Promise<void> {
    await this.binding.send({
      from: msg.from ?? this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    });
  }
}

/** Cloudflare Email Sending via REST. */
export class CloudflareRestEmailSender implements EmailSender {
  constructor(
    private accountId: string,
    private apiToken: string,
    private from: string
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: msg.from ?? this.from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[email] Cloudflare REST send failed ${res.status}: ${body}`);
    }
  }
}

/** Logs the email — safe fallback so auth flows don't break without a provider. */
export class ConsoleEmailSender implements EmailSender {
  async send(msg: EmailMessage): Promise<void> {
    console.info(
      `[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text}`
    );
  }
}

/** Pick a sender based on what's configured in the environment. */
export function getEmailSender(env: EmailEnv): EmailSender {
  const from = env.EMAIL_FROM || DEFAULT_FROM;
  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    return new BindingEmailSender(env.EMAIL, from);
  }
  if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN) {
    return new CloudflareRestEmailSender(env.CF_ACCOUNT_ID, env.CF_API_TOKEN, from);
  }
  return new ConsoleEmailSender();
}
