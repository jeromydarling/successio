/**
 * Prompted-interview questions for tribal-knowledge capture, per vertical.
 * Shown on the Knowledge page; the org's vertical picks the set. Wording is
 * deliberately plain-spoken — these are read aloud to owners, not engineers.
 */

const SHARED_CLOSERS = [
  "If you were gone for a month, what would go wrong first?",
  "What's the most important thing a new owner would need to know on day one?",
  "How do you handle a difficult customer or a job gone wrong?",
];

export const INTERVIEW_QUESTIONS: Record<string, string[]> = {
  manufacturing: [
    "How do you quote a job from scratch?",
    "Who are your three most important customers, and why do they keep coming back?",
    "What breaks most often on the shop floor — and how do you handle it?",
    "Walk me through a job from order to shipping.",
    "What does your quality check process look like?",
    ...SHARED_CLOSERS,
  ],
  hvac: [
    "How do you price a new install versus a service call?",
    "Who are your best repeat customers — service contracts, builders, property managers?",
    "Walk me through a typical service call from dispatch to invoice.",
    "How do you handle the seasonal swing between heating and cooling season?",
    "Which suppliers do you rely on, and what happens if one falls through?",
    ...SHARED_CLOSERS,
  ],
  plumbing: [
    "How do you price a job — service rates, bids, change orders?",
    "Who calls you first: homeowners, GCs, or property managers — and why you?",
    "Walk me through an emergency call from the phone ringing to getting paid.",
    "What licenses and inspections matter most in your area, and how do you stay current?",
    "Which fixtures or systems do you see fail most, and how do you stock for it?",
    ...SHARED_CLOSERS,
  ],
  electrical: [
    "How do you bid residential versus commercial work?",
    "Walk me through pulling a permit and passing inspection in your area.",
    "Who are your steadiest sources of work — builders, facilities, service calls?",
    "How do you decide what wire, panels, and parts to keep in stock?",
    "What jobs do you turn down, and why?",
    ...SHARED_CLOSERS,
  ],
  construction: [
    "How do you estimate and bid a project from a set of plans?",
    "Walk me through a project from contract signing to final walkthrough.",
    "How do you find and keep good subs, and who are your go-tos?",
    "How do you handle change orders and keep them from eating the margin?",
    "What does your punch-list and closeout process look like?",
    ...SHARED_CLOSERS,
  ],
  trucking: [
    "How do you find loads — brokers, direct shippers, load boards?",
    "Walk me through a typical haul from booking to getting paid.",
    "How do you handle maintenance schedules and DOT inspections?",
    "Who are your best-paying lanes and customers, and why do they use you?",
    "How do you find and keep good drivers?",
    ...SHARED_CLOSERS,
  ],
  agriculture: [
    "Walk me through your year — planting to harvest to sale.",
    "Who buys from you — co-ops, processors, direct — and on what terms?",
    "How do you decide what to plant or raise each season?",
    "What equipment can't the operation run without, and who maintains it?",
    "Which leases, water rights, or contracts would a new owner need to keep?",
    ...SHARED_CLOSERS,
  ],
};

export function questionsForVertical(vertical: string | undefined | null): string[] {
  return INTERVIEW_QUESTIONS[vertical ?? ""] ?? INTERVIEW_QUESTIONS.manufacturing;
}
