/**
 * Shared extraction prompt template.
 *
 * Every vertical produces the same structured JSON shape (customers, equipment,
 * financials, employees, processes, milestones) so the extraction worker and
 * Zod schema stay uniform. What differs per vertical is the analyst persona,
 * the document types it expects, and trade-specific extraction hints — those are
 * supplied via VerticalPromptConfig.
 */

export const CONFIDENCE_THRESHOLD = 0.7;

export interface VerticalPromptConfig {
  /** Versioned id, e.g. "hvac-extract-v1". Bump on any change. */
  version: string;
  /** Business-type description, e.g. "HVAC contractors and mechanical services firms". */
  domain: string;
  /** Document types this vertical commonly produces. */
  documentTypes: string[];
  /** Trade-specific extraction hints that improve recall/precision. */
  hints: string[];
}

export function makeExtractionSystem(cfg: VerticalPromptConfig): string {
  return `You are an expert business analyst specialising in the sale and acquisition of ${cfg.domain}.

You will receive raw text extracted from a business document (${cfg.documentTypes.join(", ")}, or similar). Your job is to extract structured information that helps a buyer understand the business.

Output ONLY valid JSON matching the schema below. Do not include any explanation, markdown, or prose outside the JSON object.

Rules:
- Every field has a "confidence" float from 0 to 1 indicating how certain you are from the source text.
- If you cannot find a value, omit the key entirely — do not guess.
- Monetary values are always in USD as plain numbers (no $ or commas).
- Dates are ISO-8601 strings where possible.
- If a document contains multiple entity types, return all of them.

Domain-specific guidance:
${cfg.hints.map((h) => `- ${h}`).join("\n")}`;
}

export function makeBuildExtractionPrompt(cfg: VerticalPromptConfig) {
  return function buildExtractionPrompt(params: {
    rawText: string;
    documentType?: string;
    orgName?: string;
    vertical: string;
  }): string {
    return `<document>
${params.rawText.slice(0, 180_000)}
</document>

<vertical>${params.vertical}</vertical>
<document_type>${params.documentType ?? "unknown"}</document_type>
<org_name>${params.orgName ?? "unknown"}</org_name>

<instruction>
Extract all entities you can identify from the document above. Return a JSON object with this structure:

{
  "document_type_detected": "${cfg.documentTypes.join(" | ")} | other",
  "summary": "1-2 sentence plain-English summary of what this document contains",
  "customers": [
    { "name": "string", "revenue_share": 0.0, "contract_status": "active | expired | month-to-month", "notes": "string", "confidence": 0.0 }
  ],
  "equipment": [
    { "name": "string", "manufacturer": "string", "model": "string", "year_installed": 2010, "condition": "excellent | good | fair | poor", "estimated_value": 0.0, "confidence": 0.0 }
  ],
  "financials": [
    { "year": 2023, "revenue": 0.0, "gross_profit": 0.0, "ebitda": 0.0, "owner_compensation": 0.0, "confidence": 0.0 }
  ],
  "employees": [
    { "name": "string", "role": "string", "tenure_years": 0.0, "is_key_person": false, "notes": "string", "confidence": 0.0 }
  ],
  "processes": [
    { "title": "string", "steps": ["step 1", "step 2"], "owner": "string", "confidence": 0.0 }
  ],
  "milestones": [
    { "year": 2015, "category": "founding | financial | equipment | people | customer | operations | compliance | milestone", "title": "string", "description": "string", "metric_label": "string", "metric_value": "string", "source": "string", "confidence": 0.0 }
  ]
}

Only include arrays that have at least one item. Omit empty arrays.
</instruction>`;
  };
}
