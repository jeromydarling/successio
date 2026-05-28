/**
 * Vertical → extraction-prompt registry.
 * The extraction worker uses this to pick the correct trade-specific prompt
 * instead of always using the manufacturing one.
 */

import * as manufacturing from "./manufacturing/extract";
import * as hvac from "./hvac/extract";
import * as plumbing from "./plumbing/extract";
import * as electrical from "./electrical/extract";
import * as construction from "./construction/extract";
import * as trucking from "./trucking/extract";
import * as agriculture from "./agriculture/extract";

export interface ExtractPrompt {
  PROMPT_VERSION: string;
  EXTRACTION_SYSTEM: string;
  buildExtractionPrompt: (params: {
    rawText: string;
    documentType?: string;
    orgName?: string;
    vertical: string;
  }) => string;
  CONFIDENCE_THRESHOLD: number;
}

const REGISTRY: Record<string, ExtractPrompt> = {
  manufacturing,
  hvac,
  plumbing,
  electrical,
  construction,
  trucking,
  agriculture,
};

/** Returns the extraction prompt for a vertical, falling back to manufacturing. */
export function getExtractPrompt(vertical: string): ExtractPrompt {
  return REGISTRY[vertical] ?? manufacturing;
}
