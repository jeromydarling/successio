/**
 * Typed AI client. ALL AI calls go through this — never call provider APIs
 * directly from feature code.
 *
 * Current reality: every default model below is `@cf/*`, which runs on the
 * native Workers AI binding (no gateway hop, no external keys). The
 * gateway.ai.cloudflare.com path + provider request/response shaping only
 * activates for `anthropic/*`, `google/*`, or `mistral/*` model ids once the
 * corresponding API key secrets are provisioned. Gateway-level caching (the
 * cf-aig-* headers) applies only to that external path.
 */

export const MODELS = {
  // Workers-AI-first: runs on the native AI binding, no external keys or gateway.
  extraction:    "@cf/meta/llama-3.3-70b-instruct-fp8-fast", // primary extraction
  extraction_fb: "@cf/meta/llama-3.1-8b-instruct",            // lighter fallback
  ocr_heavy:     "@cf/meta/llama-3.2-11b-vision-instruct",    // image transcription
  ocr_light:     "@cf/meta/llama-3.2-11b-vision-instruct",    // image transcription
  embeddings:    "@cf/baai/bge-base-en-v1.5",                 // Workers AI native
  transcription: "@cf/openai/whisper",                         // Workers AI native
  profile_draft: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",  // CIM narrative drafting
  translation:   "@cf/meta/llama-3.3-70b-instruct-fp8-fast",  // on-demand translation
} as const;

export type ModelKey = keyof typeof MODELS;

/**
 * Key-aware model routing: the spec's external stack (Claude for extraction
 * and profile drafting, Gemini as extraction fallback) lights up automatically
 * per-provider the moment its API key secret is provisioned — with the
 * Workers AI models as the always-available default. No code changes needed
 * when a key is added; the deploy workflow syncs keys from GitHub secrets.
 */
export function modelsFor(env: {
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
}): Record<ModelKey, string> {
  return {
    ...MODELS,
    extraction:    env.ANTHROPIC_API_KEY ? "anthropic/claude-sonnet-5" : MODELS.extraction,
    profile_draft: env.ANTHROPIC_API_KEY ? "anthropic/claude-sonnet-5" : MODELS.profile_draft,
    extraction_fb: env.GOOGLE_AI_API_KEY ? "google/gemini-2.5-flash"   : MODELS.extraction_fb,
  };
}

interface GatewayRequestOptions {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  max_tokens?: number;
  temperature?: number;
  /** Stream is never used — we always wait for full structured output. */
}

interface GatewayResponse {
  content: string;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
  cached: boolean;
}

export class AIGateway {
  private baseUrl: string;

  constructor(
    private accountId: string,
    private gatewayId: string,
    private env: {
      AI: Ai;
      ANTHROPIC_API_KEY?: string;
      GOOGLE_AI_API_KEY?: string;
      MISTRAL_API_KEY?: string;
      /** AI Gateway authentication token (cf-aig-authorization) — required
       *  when the gateway has Authenticated Gateway enabled. */
      CF_AIG_TOKEN?: string;
    }
  ) {
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}`;
  }

  /** Call a chat-completion model. `@cf/*` models run on Workers AI directly;
   *  everything else routes through the AI Gateway to an external provider —
   *  and if the external path fails for ANY reason (gateway auth, provider
   *  outage, bad key), we degrade to the Workers AI default model rather
   *  than failing the caller. Availability beats model choice: a document
   *  pipeline or profile draft must never die on provider config.
   */
  async complete(opts: GatewayRequestOptions): Promise<GatewayResponse> {
    const provider = this.providerFromModel(opts.model);

    // Workers AI — native binding, no gateway/keys required.
    if (provider === "workers-ai") {
      return this.completeWorkersAI(opts);
    }

    try {
      return await this.completeExternal(provider, opts);
    } catch (err) {
      console.error(
        `[ai-gateway] external call failed (${opts.model}) — degrading to Workers AI:`,
        err
      );
      return this.completeWorkersAI({ ...opts, model: MODELS.extraction });
    }
  }

  private async completeExternal(
    provider: string,
    opts: GatewayRequestOptions
  ): Promise<GatewayResponse> {

    if (!this.accountId) {
      throw new Error("[ai-gateway] CF_ACCOUNT_ID required for external provider calls");
    }

    const apiKey = this.apiKeyForProvider(provider);
    if (!apiKey) {
      throw new Error(`[ai-gateway] No API key for provider: ${provider}`);
    }

    const modelName = opts.model.replace(/^[^/]+\//, "");
    const url = this.endpointFor(provider, modelName);
    const body = this.buildRequestBody(provider, opts);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeadersFor(provider, apiKey),
        // Gateway caching header
        "cf-aig-cache-ttl": "86400",
        "cf-aig-skip-cache": "false",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      throw new Error(`[ai-gateway] ${provider} ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    return this.parseResponse(provider, data);
  }

  /** Provider-native endpoint behind the gateway (the gateway proxies the
   *  provider's real API, so the provider's own path must be appended). */
  private endpointFor(provider: string, modelName: string): string {
    switch (provider) {
      case "anthropic":        return `${this.baseUrl}/anthropic/v1/messages`;
      case "google-ai-studio": return `${this.baseUrl}/google-ai-studio/v1/models/${modelName}:generateContent`;
      case "mistral":          return `${this.baseUrl}/mistral/v1/chat/completions`;
      default:                 throw new Error(`[ai-gateway] no endpoint for provider: ${provider}`);
    }
  }

  /** Each provider expects its own auth header scheme. When the gateway has
   *  Authenticated Gateway enabled, every request additionally needs the
   *  cf-aig-authorization header or it 401s before reaching the provider. */
  private authHeadersFor(provider: string, apiKey: string): Record<string, string> {
    const gatewayAuth: Record<string, string> = this.env.CF_AIG_TOKEN
      ? { "cf-aig-authorization": `Bearer ${this.env.CF_AIG_TOKEN}` }
      : {};
    switch (provider) {
      case "anthropic":        return { ...gatewayAuth, "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
      case "google-ai-studio": return { ...gatewayAuth, "x-goog-api-key": apiKey };
      default:                 return { ...gatewayAuth, Authorization: `Bearer ${apiKey}` };
    }
  }

  /**
   * OCR a scanned PDF with Mistral's dedicated Document AI endpoint (via the
   * gateway). Returns null when the key isn't provisioned — the caller falls
   * back to Browser Rendering rasterization. ~$1 per 1,000 pages.
   */
  async ocrPdfMistral(bytes: ArrayBuffer): Promise<string | null> {
    if (!this.env.MISTRAL_API_KEY || !this.accountId) return null;
    try {
      const b64 = arrayBufferToBase64(bytes);
      const res = await fetch(`${this.baseUrl}/mistral/v1/ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.env.MISTRAL_API_KEY}`,
          ...(this.env.CF_AIG_TOKEN ? { "cf-aig-authorization": `Bearer ${this.env.CF_AIG_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: { type: "document_url", document_url: `data:application/pdf;base64,${b64}` },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        console.warn(`[ai-gateway] mistral OCR ${res.status}: ${await res.text().catch(() => "")}`);
        return null;
      }
      const data = (await res.json()) as { pages?: { markdown?: string }[] };
      const text = (data.pages ?? [])
        .map((p) => p.markdown ?? "")
        .filter(Boolean)
        .join("\n\n")
        .trim();
      return text.length > 0 ? text : null;
    } catch (err) {
      console.warn("[ai-gateway] mistral OCR failed:", err);
      return null;
    }
  }

  /** Text generation on Workers AI (Llama). Returns the same shape as complete(). */
  private async completeWorkersAI(opts: GatewayRequestOptions): Promise<GatewayResponse> {
    const result = (await (this.env.AI as any).run(opts.model, {
      messages: opts.messages,
      max_tokens: opts.max_tokens ?? 4096,
      temperature: opts.temperature ?? 0,
    })) as { response?: string };
    return {
      content: result.response ?? "",
      usage: { input_tokens: 0, output_tokens: 0 },
      model: opts.model,
      cached: false,
    };
  }

  /** Convert a document (PDF/DOCX/XLSX/CSV/HTML/JSON…) to Markdown via the
   *  native Workers AI binding. Returns "" on unsupported/empty/error — it
   *  must NEVER throw: the OCR chain has plain-text and raster fallbacks that
   *  handle "" fine, whereas a throw fails the whole workflow step (seen in
   *  prod as AiInternalError on a simple CSV, killing the document). */
  async toMarkdown(name: string, bytes: ArrayBuffer): Promise<string> {
    try {
      const results = (await (this.env.AI as any).toMarkdown([
        { name, blob: new Blob([bytes]) },
      ])) as { format?: string; data?: string }[] | { format?: string; data?: string };
      const first = Array.isArray(results) ? results[0] : results;
      return first?.format === "markdown" ? (first.data ?? "") : "";
    } catch (err) {
      console.warn(`[ai-gateway] toMarkdown failed for ${name} — falling back:`, err);
      return "";
    }
  }

  /** Transcribe text from an image using a Workers AI vision model.
   *  Llama 3.2 vision needs the image as a byte array, and has a one-time Meta
   *  license gate that we accept automatically on first use. */
  async ocrImage(bytes: ArrayBuffer): Promise<string> {
    try {
      return await this.runVision(bytes);
    } catch (err) {
      // First call may fail on the unaccepted Meta license — accept and retry.
      try {
        await (this.env.AI as any).run(MODELS.ocr_heavy, { prompt: "agree" });
      } catch { /* ignore */ }
      try {
        return await this.runVision(bytes);
      } catch (err2) {
        console.error("[ocr] vision OCR failed:", err2 ?? err);
        return "";
      }
    }
  }

  private async runVision(bytes: ArrayBuffer): Promise<string> {
    const result = (await (this.env.AI as any).run(MODELS.ocr_heavy, {
      image: [...new Uint8Array(bytes)],
      prompt:
        "You are an OCR engine. Transcribe ALL text in this document image exactly as it appears — preserve line breaks, column order, and tables (as Markdown tables). Do not summarize, infer, or add anything. Output only the transcription.",
      max_tokens: 2048,
      temperature: 0,
    })) as { response?: string; description?: string };
    return result.response ?? result.description ?? "";
  }

  /**
   * Translate a batch of strings into `targetLanguage` using Llama. The source
   * language is auto-detected; strings already in the target are returned
   * unchanged. Output stays aligned 1:1 with the input order — we ask for a JSON
   * array and, if the model returns the wrong shape/length, fall back to
   * translating each string on its own so structured content (e.g. SOP steps)
   * never gets misaligned. Empty strings are passed through without a model call.
   */
  async translate(opts: { texts: string[]; targetLanguage: string }): Promise<string[]> {
    const { texts, targetLanguage } = opts;
    const indexed = texts.map((t, i) => ({ i, t: t ?? "" }));
    const toTranslate = indexed.filter((x) => x.t.trim().length > 0);
    if (toTranslate.length === 0) return texts.map((t) => t ?? "");

    const out = texts.map((t) => t ?? "");
    const system =
      `You are a professional translator. Translate every string in the input JSON array into ${targetLanguage}. ` +
      `Preserve meaning, tone, line breaks, numbers, units, currency symbols, and proper nouns. ` +
      `If a string is already in ${targetLanguage}, return it unchanged. Do not add notes or explanations. ` +
      `Respond with ONLY a JSON array of strings, the same length and order as the input.`;

    try {
      const res = await this.complete({
        model: MODELS.translation,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(toTranslate.map((x) => x.t)) },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      });
      const parsed = this.parseJsonArray(res.content);
      if (parsed && parsed.length === toTranslate.length) {
        toTranslate.forEach((x, k) => (out[x.i] = parsed[k]));
        return out;
      }
    } catch (err) {
      console.warn("[translate] batch failed, falling back per-item:", err);
    }

    // Fallback: translate each segment independently to guarantee alignment.
    await Promise.all(
      toTranslate.map(async (x) => {
        try {
          const res = await this.complete({
            model: MODELS.translation,
            messages: [
              { role: "system", content: `Translate the user's text into ${targetLanguage}. If it is already in ${targetLanguage}, return it unchanged. Output only the translation, with no quotes or commentary.` },
              { role: "user", content: x.t },
            ],
            max_tokens: 1024,
            temperature: 0.2,
          });
          out[x.i] = res.content.trim() || x.t;
        } catch {
          out[x.i] = x.t; // last resort: keep the original
        }
      })
    );
    return out;
  }

  /** Best-effort parse of a JSON string array, tolerating code fences/prose. */
  private parseJsonArray(raw: string): string[] | null {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) return null;
    try {
      const arr = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) return arr;
    } catch { /* fall through */ }
    return null;
  }

  /** Run Whisper (Workers AI native — does not go through gateway). */
  async transcribeAudio(audioBytes: ArrayBuffer): Promise<string> {
    const result = (await (this.env.AI as any).run("@cf/openai/whisper", {
      audio: [...new Uint8Array(audioBytes)],
    })) as { text?: unknown };
    // Validate the transport shape — garbage here would flow into SOPs and D1.
    if (typeof result?.text !== "string") {
      throw new Error("[ai-gateway] Whisper returned an unexpected shape");
    }
    return result.text;
  }

  /** Generate embeddings via Workers AI (native, no gateway). */
  async embed(texts: string[]): Promise<number[][]> {
    const result = (await (this.env.AI as any).run("@cf/baai/bge-base-en-v1.5", {
      text: texts,
    })) as { data?: unknown };
    const data = result?.data;
    const valid =
      Array.isArray(data) &&
      data.length === texts.length &&
      data.every((v) => Array.isArray(v) && v.every((n) => typeof n === "number"));
    if (!valid) {
      throw new Error("[ai-gateway] embedding model returned an unexpected shape");
    }
    return data as number[][];
  }

  private providerFromModel(model: string): string {
    if (model.startsWith("anthropic/")) return "anthropic";
    if (model.startsWith("google/") || model.startsWith("gemini")) return "google-ai-studio";
    if (model.startsWith("mistral/")) return "mistral";
    if (model.startsWith("@cf/")) return "workers-ai";
    throw new Error(`Unknown model provider: ${model}`);
  }

  private apiKeyForProvider(provider: string): string | undefined {
    switch (provider) {
      case "anthropic":       return this.env.ANTHROPIC_API_KEY;
      case "google-ai-studio":return this.env.GOOGLE_AI_API_KEY;
      case "mistral":         return this.env.MISTRAL_API_KEY;
      default:                return "workers-ai"; // Workers AI uses account binding
    }
  }

  private buildRequestBody(provider: string, opts: GatewayRequestOptions): unknown {
    const modelName = opts.model.replace(/^[^/]+\//, ""); // strip provider prefix
    switch (provider) {
      case "anthropic":
        return {
          model: modelName,
          max_tokens: opts.max_tokens ?? 4096,
          temperature: opts.temperature ?? 0,
          system: opts.messages.find(m => m.role === "system")?.content,
          messages: opts.messages.filter(m => m.role !== "system"),
        };
      case "google-ai-studio":
        return {
          model: modelName,
          contents: opts.messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: opts.max_tokens ?? 4096, temperature: opts.temperature ?? 0 },
        };
      case "mistral":
        return {
          model: modelName,
          messages: opts.messages,
          max_tokens: opts.max_tokens ?? 4096,
          temperature: opts.temperature ?? 0,
        };
      default:
        return { messages: opts.messages };
    }
  }

  private parseResponse(provider: string, data: any): GatewayResponse {
    const cached = data.cf_cache_status === "HIT";
    switch (provider) {
      case "anthropic":
        return {
          content: data.content?.[0]?.text ?? "",
          usage: { input_tokens: data.usage?.input_tokens ?? 0, output_tokens: data.usage?.output_tokens ?? 0 },
          model: data.model ?? "",
          cached,
        };
      case "google-ai-studio":
        return {
          content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
          usage: { input_tokens: data.usageMetadata?.promptTokenCount ?? 0, output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0 },
          model: data.modelVersion ?? "",
          cached,
        };
      case "mistral":
        return {
          content: data.choices?.[0]?.message?.content ?? "",
          usage: { input_tokens: data.usage?.prompt_tokens ?? 0, output_tokens: data.usage?.completion_tokens ?? 0 },
          model: data.model ?? "",
          cached,
        };
      default:
        return { content: JSON.stringify(data), usage: { input_tokens: 0, output_tokens: 0 }, model: "", cached };
    }
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Factory — call once per Worker request. */
export function makeGateway(env: {
  AI: Ai;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  CF_AIG_TOKEN?: string;
}): AIGateway {
  // Workers AI (the default model routing) needs no account id; only external
  // providers via the gateway do. Pass it through when present.
  return new AIGateway(env.CF_ACCOUNT_ID ?? "", env.CF_AI_GATEWAY_ID, env);
}
