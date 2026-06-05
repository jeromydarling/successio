/**
 * Language registry + browser-language detection for on-demand translation.
 * English/Spanish are first-class (the US blue-collar workforce); the rest are
 * common targets. Source language is always auto-detected by the model, so this
 * list only needs to cover translation *targets* we offer in the UI.
 */

export interface Language {
  code: string; // BCP-47 base (e.g. "es")
  label: string; // English name
  native: string; // endonym, shown in the picker
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "tl", label: "Tagalog", native: "Tagalog" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** English display name for a language code — what we feed the model. */
export function languageLabel(code: string): string {
  return BY_CODE.get(code)?.label ?? code;
}

export function isSupportedLanguage(code: string): boolean {
  return BY_CODE.has(code);
}

/**
 * The viewer's preferred language, narrowed to one we support. Falls back to
 * English. Safe to call on the server (returns "en" when navigator is absent).
 */
export function detectBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const pref of prefs) {
    const base = pref?.toLowerCase().split("-")[0];
    if (base && BY_CODE.has(base)) return base;
  }
  return "en";
}
