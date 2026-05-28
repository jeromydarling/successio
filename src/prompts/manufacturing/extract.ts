/**
 * Manufacturing vertical — entity extraction prompt.
 * Built from the shared template; bump `version` on any change so A/B tests
 * and audit trails can reference the exact prompt that produced an extraction.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "manufacturing-extract-v1",
  domain: "manufacturing businesses — machine shops, job shops, fabricators, and precision parts suppliers",
  documentTypes: ["work_order", "quote", "job_traveler", "purchase_order", "customer_list", "equipment_list", "qc_record", "financial"],
  hints: [
    "Equipment is often CNC machines, lathes, mills, press brakes, or welders — capture manufacturer, model, and age.",
    "Customer concentration matters: estimate each customer's share of revenue when figures are present.",
    "Look for ISO 9001 / AS9100 certifications and capture them as compliance milestones.",
    "Job travelers and work orders reveal core production processes — extract them as SOP-style step lists.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
