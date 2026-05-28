/**
 * Electrical vertical — entity extraction prompt.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "electrical-extract-v1",
  domain: "electrical contractors — residential, commercial, and industrial electrical installation and service",
  documentTypes: ["bid", "service_agreement", "permit", "inspection_report", "customer_list", "truck_inventory", "financial", "master_license"],
  hints: [
    "General contractor and property-manager relationships drive commercial volume — capture them as customers.",
    "Equipment includes bucket trucks, generators, wire pullers, and test instruments.",
    "Master electrician license, low-voltage licenses, and any solar/EV certifications are key compliance milestones.",
    "Service vs project (new construction) revenue split is valuable context — note it where evident.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
