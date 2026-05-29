/**
 * Extract a JSON object/array from possibly-chatty LLM output.
 *
 * Open models (Llama) often wrap JSON in ```fences``` or add a sentence before
 * or after it. JSON.parse then fails with "unexpected non-whitespace character
 * after JSON". This strips fences and slices to the outermost braces/brackets.
 */
export function extractJson(text: string): string {
  let s = text.trim();

  // Strip a ```json … ``` (or plain ``` … ```) fence if present.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) s = fence[1].trim();

  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  if (firstObj === -1 && firstArr === -1) return s;

  let start: number;
  let closeCh: string;
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    closeCh = "]";
  } else {
    start = firstObj;
    closeCh = "}";
  }

  const end = s.lastIndexOf(closeCh);
  return end > start ? s.slice(start, end + 1) : s;
}
