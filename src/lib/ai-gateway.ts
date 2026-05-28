/**
 * Typed Cloudflare AI Gateway client.
 * ALL AI calls go through this — never call provider APIs directly.
 * Routes through https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/
 *
 * Configured with:
 *   - Semantic caching (24 hr) to cut costs on repeated extraction runs
 *   - 30-second timeout enforced at the gateway level
 *   - Automatic retry (3x) at the gateway level
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
} as const;

export type ModelKey = keyof typeof MODELS;

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
    private env: { AI: Ai; ANTHROPIC_API_KEY?: string; GOOGLE_AI_API_KEY?: string; MISTRAL_API_KEY?: string }
  ) {
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}`;
  }

  /** Call a chat-completion model. `@cf/*` models run on Workers AI directly;
   *  everything else routes through the AI Gateway to an external provider. */
  async complete(opts: GatewayRequestOptions): Promise<GatewayResponse> {
    const provider = this.providerFromModel(opts.model);

    // Workers AI — native binding, no gateway/keys required.
    if (provider === "workers-ai") {
      return this.completeWorkersAI(opts);
    }

    if (!this.accountId) {
      throw new Error("[ai-gateway] CF_ACCOUNT_ID required for external provider calls");
    }
    const url = `${this.baseUrl}/${provider}`;

    const apiKey = this.apiKeyForProvider(provider);
    if (!apiKey) {
      throw new Error(`[ai-gateway] No API key for provider: ${provider}`);
    }

    const body = this.buildRequestBody(provider, opts);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

  /** Transcribe text from an image using a Workers AI vision model. */
  async ocrImage(bytes: ArrayBuffer): Promise<string> {
    const result = (await (this.env.AI as any).run(MODELS.ocr_heavy, {
      image: [...new Uint8Array(bytes)],
      prompt:
        "Transcribe all text in this document image exactly as written. Preserve structure and line breaks. Output only the transcription, no commentary.",
      max_tokens: 2048,
    })) as { response?: string; description?: string };
    return result.response ?? result.description ?? "";
  }

  /** Run Whisper (Workers AI native — does not go through gateway). */
  async transcribeAudio(audioBytes: ArrayBuffer): Promise<string> {
    const result = await (this.env.AI as any).run("@cf/openai/whisper", {
      audio: [...new Uint8Array(audioBytes)],
    }) as { text: string };
    return result.text;
  }

  /** Generate embeddings via Workers AI (native, no gateway). */
  async embed(texts: string[]): Promise<number[][]> {
    const result = await (this.env.AI as any).run("@cf/baai/bge-base-en-v1.5", {
      text: texts,
    }) as { data: number[][] };
    return result.data;
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

/** Factory — call once per Worker request. */
export function makeGateway(env: {
  AI: Ai;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
}): AIGateway {
  // Workers AI (the default model routing) needs no account id; only external
  // providers via the gateway do. Pass it through when present.
  return new AIGateway(env.CF_ACCOUNT_ID ?? "", env.CF_AI_GATEWAY_ID, env);
}
