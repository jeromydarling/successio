/**
 * Trucking vertical — entity extraction prompt.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "trucking-extract-v1",
  domain: "trucking and freight carriers — for-hire trucking, logistics, and hauling operations",
  documentTypes: ["rate_confirmation", "bill_of_lading", "lease_agreement", "ifta_filing", "customer_list", "fleet_list", "financial", "dot_authority"],
  hints: [
    "Shipper and broker relationships are the customer base — capture lane/contract details and revenue share.",
    "Fleet equipment (tractors, trailers, reefers) should be recorded with make, model, year, and mileage/condition in notes.",
    "DOT operating authority (MC number), safety rating, and IFTA standing are critical compliance milestones.",
    "Owner-operators vs company drivers materially affects the people picture — note the mix.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
