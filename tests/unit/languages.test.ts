import { describe, it, expect, afterEach, vi } from "vitest";
import {
  LANGUAGES,
  languageLabel,
  isSupportedLanguage,
  detectBrowserLanguage,
} from "@/lib/languages";

describe("language registry", () => {
  it("includes English and Spanish as first-class", () => {
    expect(LANGUAGES[0].code).toBe("en");
    expect(LANGUAGES.some((l) => l.code === "es")).toBe(true);
  });

  it("maps codes to English display names for the model", () => {
    expect(languageLabel("es")).toBe("Spanish");
    expect(languageLabel("zz")).toBe("zz"); // unknown → passthrough
  });

  it("validates supported codes", () => {
    expect(isSupportedLanguage("pt")).toBe(true);
    expect(isSupportedLanguage("xx")).toBe(false);
  });
});

describe("detectBrowserLanguage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to English when navigator is absent", () => {
    expect(detectBrowserLanguage()).toBe("en");
  });

  it("narrows a regional tag to a supported base language", () => {
    vi.stubGlobal("navigator", { languages: ["es-MX", "en-US"] });
    expect(detectBrowserLanguage()).toBe("es");
  });

  it("skips unsupported preferences", () => {
    vi.stubGlobal("navigator", { languages: ["is-IS", "pt-BR"] });
    expect(detectBrowserLanguage()).toBe("pt");
  });
});
