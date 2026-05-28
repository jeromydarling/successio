/**
 * Agriculture vertical — entity extraction prompt.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "agriculture-extract-v1",
  domain: "agricultural operations — farms, ranches, and ag-services businesses",
  documentTypes: ["crop_plan", "supply_contract", "lease", "equipment_list", "land_record", "customer_list", "financial", "organic_certification"],
  hints: [
    "Land — owned vs leased acreage — is the central asset; capture acreage and lease terms in notes and milestones.",
    "Equipment includes tractors, combines, irrigation systems, and implements — record make, model, year, hours/condition.",
    "Buyer/off-take contracts (co-ops, processors, distributors) are the customer base — capture contract status.",
    "Organic, GAP, or other certifications and water rights are key compliance milestones.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
