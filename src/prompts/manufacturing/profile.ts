export const PROFILE_PROMPT_VERSION = "manufacturing-profile-v2";

interface ProfileContext {
  org: { name: string; vertical: string; location?: string | null; founded?: number | null; employeeCount?: number | null; annualRevenue?: number | null; description?: string | null };
  customers: Array<{ name: string; revenueShare?: number | null; contractStatus?: string | null }>;
  financials: Array<{ year: number; revenue?: number | null; grossProfit?: number | null; ebitda?: number | null; ownerCompensation?: number | null }>;
  // Deliberately no names — shared profiles must never identify individual
  // employees. Roles + tenure carry the signal buyers need.
  employees: Array<{ role: string; tenureYears?: number | null; isKeyPerson: boolean }>;
  processes: Array<{ title: string; steps: string }>;
  equipment: Array<{ name: string; manufacturer?: string | null; yearInstalled?: number | null; estimatedValue?: number | null }>;
}

export function buildProfilePrompt(ctx: ProfileContext): string {
  return `You are a mergers & acquisitions advisor helping a manufacturing business owner prepare a Confidential Information Memorandum (CIM) for sale.

Using the structured business data below, draft a professional, honest, and compelling business profile. Write in clear, professional language — not marketing fluff. A qualified buyer or lender will read this.

<business_data>
${JSON.stringify(ctx, null, 2)}
</business_data>

<instruction>
Return ONLY valid JSON with this exact structure:

{
  "executive_summary": "3–4 sentence overview: what the business does, how long it has operated, key financial metrics, and what makes it attractive to a buyer.",
  "business_overview": "2–3 paragraphs describing the business model, core capabilities, competitive advantages, and operational maturity.",
  "customer_overview": "Describe the customer base — concentration, contract status, tenure, and mix (commercial vs government vs direct). Be specific but protect confidentiality where needed.",
  "financial_highlights": "Summarize the financial performance in 2–3 paragraphs. Include revenue trend, margin profile, and any owner add-backs. If data is limited, note what was available.",
  "operations": "Describe how the business runs day-to-day: equipment, workflow, quality systems, any certifications or processes documented.",
  "team": "Describe the key people, their roles, tenure, and how owner-dependent the business is. Flag any key-person risk honestly.",
  "equipment_and_assets": "Summarize major equipment and asset values where known. Note condition and estimated remaining useful life.",
  "opportunity": "2–3 sentences on why this business represents an opportunity — growth levers, untapped markets, or operational improvements a new owner could pursue.",
  "reason_for_sale": "Brief, honest statement on the owner's motivation (retirement, health, no successor, etc.)."
}

Write each section as polished prose — no bullet points, no markdown, no headers within the field. The JSON must parse cleanly.

Hard rules:
- NEVER name an individual employee anywhere in any section. Refer to people only by role and tenure ("a shop foreman with 18 years at the company"). This document circulates to strangers before the team knows the business is for sale.
- NEVER state a dollar amount or percentage that is not present in (or directly computable from) the business_data above. If a number is unknown, say so plainly instead of estimating.
</instruction>`;
}
