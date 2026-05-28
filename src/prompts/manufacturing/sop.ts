export const SOP_PROMPT_VERSION = "manufacturing-sop-v1";

export function buildSopPrompt(params: {
  transcript: string;
  question?: string;
  orgName?: string;
}): string {
  return `You are a manufacturing operations consultant writing a Standard Operating Procedure (SOP) card for a machine shop that is preparing for ownership transition.

The text below is a transcribed voice note from the business owner answering a question about their operations.

${params.question ? `<question>${params.question}</question>\n` : ""}<transcript>
${params.transcript}
</transcript>
<org>${params.orgName ?? "the business"}</org>

<instruction>
Convert the transcript into a clean, structured SOP. Return ONLY valid JSON:

{
  "title": "Short, action-oriented title (e.g. 'How we quote a job')",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "owner": "Who typically performs this process (role, not name if possible)",
  "notes": "Any important caveats, exceptions, or institutional knowledge captured",
  "confidence": 0.85
}

Write steps in present tense, active voice. Capture the specific details, not generic advice.
</instruction>`;
}
