/**
 * Plumbing vertical — entity extraction prompt.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "plumbing-extract-v1",
  domain: "plumbing contractors — residential and commercial service, repair, and new-construction plumbing",
  documentTypes: ["service_call", "install_quote", "maintenance_contract", "permit", "customer_list", "truck_inventory", "financial", "master_license"],
  hints: [
    "Service-call history and repeat customers signal recurring revenue — record repeat customers with notes.",
    "Equipment includes service vans, drain machines, hydro-jetters, and camera/locator gear.",
    "Master plumber license and backflow certifications are critical compliance milestones — the license often transfers value.",
    "Capture any commercial maintenance agreements or property-management relationships as customers.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
