/**
 * Concierge (done-for-you) — shared definitions for the public intake, the
 * superadmin queue, and the owner-facing status card. One source of truth
 * for prices, statuses, and the intake schema.
 */

import { z } from "zod";

/** Pricing model: one fee, paid in full or spread over 12 months. */
export const PRICES = {
  newOwner: { once: 249, monthly12: 24 },
  owner: { once: 499, monthly12: 49 },
  concierge: { once: 2495, monthly12: 249 },
} as const;

export const CONCIERGE_TIMELINES = {
  under_6mo: "In the next 6 months",
  "6_12mo": "6–12 months out",
  "12_24mo": "1–2 years out",
  exploring: "Just exploring",
} as const;
export type ConciergeTimeline = keyof typeof CONCIERGE_TIMELINES;

export const CONCIERGE_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "in_progress",
  "delivered",
  "declined",
] as const;
export type ConciergeStatus = (typeof CONCIERGE_STATUSES)[number];

/** Internal labels (queue) and owner-facing messages (Settings card). */
export const CONCIERGE_STATUS_META: Record<
  ConciergeStatus,
  { label: string; ownerMessage: string; tone: "neutral" | "active" | "done" | "off" }
> = {
  new: {
    label: "New",
    ownerMessage: "We've received your request and will reach out within one business day.",
    tone: "neutral",
  },
  contacted: {
    label: "Contacted",
    ownerMessage: "We've been in touch — check your email or voicemail for next steps.",
    tone: "active",
  },
  scheduled: {
    label: "Scheduled",
    ownerMessage: "Your kickoff is on the calendar. Have your records handy — paper is fine.",
    tone: "active",
  },
  in_progress: {
    label: "In progress",
    ownerMessage: "We're building your business record now. You'll see documents and records appear here as we go.",
    tone: "active",
  },
  delivered: {
    label: "Delivered",
    ownerMessage: "Your business record and buyer profile are complete. Everything is in your account.",
    tone: "done",
  },
  declined: {
    label: "Declined",
    ownerMessage: "We weren't able to take this on right now. You're welcome to reach out again any time.",
    tone: "off",
  },
};

export const conciergeIntakeSchema = z.object({
  name: z.string().trim().min(2, "Your name, please").max(120),
  email: z.string().trim().email("A valid email address").max(320),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  businessName: z.string().trim().min(2, "Your business name").max(200),
  vertical: z.enum([
    "manufacturing",
    "hvac",
    "plumbing",
    "electrical",
    "construction",
    "trucking",
    "agriculture",
  ]),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  hasPaper: z.boolean().default(false),
  hasDigital: z.boolean().default(false),
  hasQuickbooks: z.boolean().default(false),
  timeline: z.enum(["under_6mo", "6_12mo", "12_24mo", "exploring"]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  /** Honeypot — real users never fill this. */
  website: z.string().max(0).optional().or(z.literal("")),
});
export type ConciergeIntake = z.infer<typeof conciergeIntakeSchema>;
/** Form-side shape (before Zod defaults are applied) — checkboxes may be undefined. */
export type ConciergeIntakeInput = z.input<typeof conciergeIntakeSchema>;

/** Status transitions the queue allows (anything → declined is always allowed). */
export function canTransition(from: ConciergeStatus, to: ConciergeStatus): boolean {
  if (from === to) return true;
  if (to === "declined") return true;
  const order: ConciergeStatus[] = ["new", "contacted", "scheduled", "in_progress", "delivered"];
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  // Forward moves, or stepping back one (a call fell through, etc.).
  return ti !== -1 && fi !== -1 && (ti > fi || ti === fi - 1);
}
