/**
 * Construction vertical — entity extraction prompt.
 */

import {
  makeExtractionSystem,
  makeBuildExtractionPrompt,
  CONFIDENCE_THRESHOLD,
  type VerticalPromptConfig,
} from "@/prompts/shared/extract";

const config: VerticalPromptConfig = {
  version: "construction-extract-v1",
  domain: "construction and general-contracting firms — site work, framing, remodeling, and commercial build-out",
  documentTypes: ["bid", "contract", "change_order", "subcontractor_agreement", "permit", "customer_list", "equipment_list", "financial"],
  hints: [
    "Backlog (signed-but-unbuilt contracts) is a core valuation driver — capture each project contract and its status.",
    "Heavy equipment (excavators, loaders, trucks, lifts) should be recorded with manufacturer, year, and condition.",
    "Subcontractor relationships and a reliable crew are key people/operations assets — note them.",
    "Bonding capacity and contractor license class are important compliance milestones.",
  ],
};

export const PROMPT_VERSION = config.version;
export const EXTRACTION_SYSTEM = makeExtractionSystem(config);
export const buildExtractionPrompt = makeBuildExtractionPrompt(config);
export { CONFIDENCE_THRESHOLD };
