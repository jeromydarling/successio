/**
 * HVAC vertical — entity extraction prompt.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "hvac-extract-v1",
  domain: "HVAC contractors and mechanical services firms — heating, ventilation, air conditioning, and refrigeration",
  documentTypes: ["service_agreement", "maintenance_contract", "install_quote", "work_order", "customer_list", "truck_inventory", "financial", "epa_certification"],
  hints: [
    "Recurring maintenance contracts are the most valuable asset — capture each as a customer with contract_status and revenue_share.",
    "Equipment includes service trucks, recovery machines, gauges, and installed rooftop units — record manufacturer and age.",
    "EPA 608 certification and state mechanical licenses are key compliance milestones.",
    "Distinguish residential vs commercial customer mix in notes when evident.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
