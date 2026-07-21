import { describe, it, expect } from "vitest";
import {
  welcomeEmail,
  passwordChangedEmail,
  processingFailedEmail,
  documentRequestResolvedEmail,
  dealRoomDigestEmail,
  inviteAcceptedEmail,
  passwordResetEmail,
  verifyEmail,
  associationInviteEmail,
  reEngagementEmail,
  shareVerificationEmail,
  documentRequestEmail,
  processingCompleteEmail,
} from "@/lib/email/templates";

/** Every template must return a non-empty subject, html, and text. */
const built = [
  ["welcome", welcomeEmail({ name: "Carl", url: "https://x/dashboard" })],
  ["welcome+verify", welcomeEmail({ name: "Carl", url: "https://x/dashboard", verifyUrl: "https://x/verify?token=t" })],
  ["passwordChanged", passwordChangedEmail({ name: "Carl", resetUrl: "https://x/forgot-password" })],
  ["processingFailed", processingFailedEmail({ name: "Carl", orgName: "Shop", documentName: "P&L.pdf", url: "https://x/vault" })],
  ["requestResolved:fulfilled", documentRequestResolvedEmail({ requesterName: "Bill", orgName: "Shop", status: "fulfilled" })],
  ["requestResolved:declined", documentRequestResolvedEmail({ requesterName: "Bill", orgName: "Shop", status: "declined" })],
  ["inviteAccepted", inviteAcceptedEmail({ adminName: "Dir", businessName: "Shop", associationName: "NTMA", url: "https://x/admin" })],
  ["passwordReset", passwordResetEmail({ name: "Carl", url: "https://x/reset" })],
  ["verify", verifyEmail({ name: "Carl", url: "https://x/verify" })],
  ["associationInvite", associationInviteEmail({ businessName: "Shop", associationName: "NTMA", url: "https://x/signup" })],
  ["reEngagement", reEngagementEmail({ name: "Carl", orgName: "Shop", signals: ["No login"], url: "https://x", unsubscribeUrl: "https://x/u" })],
  ["shareVerification", shareVerificationEmail({ code: "123456", orgName: "Shop" })],
  ["documentRequest", documentRequestEmail({ name: "Carl", orgName: "Shop", requesterName: "Bill", requesterEmail: "b@x.com", requestText: "tax returns", url: "https://x" })],
  ["processingComplete", processingCompleteEmail({ name: "Carl", orgName: "Shop", documentCount: 3, score: 40, url: "https://x" })],
] as const;

describe("email templates", () => {
  for (const [name, b] of built) {
    it(`${name}: has subject, html, text`, () => {
      expect(b.subject.length).toBeGreaterThan(0);
      expect(b.html).toContain("<");
      expect(b.text.length).toBeGreaterThan(0);
    });
  }

  it("welcome includes the confirm CTA only when a verify url is given", () => {
    expect(welcomeEmail({ url: "https://x/dashboard" }).html).not.toContain("Confirm email");
    expect(welcomeEmail({ url: "https://x/dashboard", verifyUrl: "https://x/v" }).html).toContain("Confirm email");
  });

  it("password-changed email carries the security-alert language and reset link", () => {
    const b = passwordChangedEmail({ name: "Carl", resetUrl: "https://x/forgot-password" });
    expect(b.text.toLowerCase()).toContain("wasn't you");
    expect(b.html).toContain("https://x/forgot-password");
  });

  it("request-resolved wording differs by outcome", () => {
    const ok = documentRequestResolvedEmail({ orgName: "Shop", status: "fulfilled" });
    const no = documentRequestResolvedEmail({ orgName: "Shop", status: "declined" });
    expect(ok.subject).not.toBe(no.subject);
    expect(ok.text.toLowerCase()).toContain("accepted");
  });

  it("digest summarizes viewer count and carries the view unsubscribe link", () => {
    const b = dealRoomDigestEmail({
      name: "Carl",
      orgName: "Shop",
      views: [
        { viewer: "Jane Buyer", tier: "nda", sections: 5, durationSeconds: 240 },
        { viewer: "Anonymous visitor", tier: "teaser", sections: null, durationSeconds: null },
      ],
      url: "https://x/profile",
      unsubscribeUrl: "https://x/api/email/unsubscribe?org=o1&type=views",
    });
    expect(b.subject).toContain("2 people");
    expect(b.html).toContain("Jane Buyer");
    expect(b.html).toContain("type=views");
  });

  it("digest singular subject for one viewer", () => {
    const b = dealRoomDigestEmail({
      orgName: "Shop",
      views: [{ viewer: "Jane", tier: "nda", sections: 1, durationSeconds: 30 }],
      url: "https://x",
      unsubscribeUrl: "https://x/u",
    });
    expect(b.subject).toContain("1 person");
  });

  it("escapes angle brackets in user-supplied names", () => {
    const b = processingFailedEmail({ orgName: "Shop", documentName: "<script>x</script>.pdf", url: "https://x" });
    expect(b.html).not.toContain("<script>x");
    expect(b.html).toContain("&lt;script&gt;");
  });
});
