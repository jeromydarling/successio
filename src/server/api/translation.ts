/**
 * On-demand translation. Public (the deal-room share page is unauthenticated),
 * so inputs are capped to keep the endpoint from being used as a free
 * translation API. Source language is auto-detected by the model.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { makeGateway } from "@/lib/ai-gateway";
import { languageLabel, isSupportedLanguage } from "@/lib/languages";
import { rateLimit, sha256Hex } from "@/lib/rate-limit";

const MAX_SEGMENTS = 60;
const MAX_TOTAL_CHARS = 24_000;

export const translationRouter = router({
  translate: publicProcedure
    .input(
      z.object({
        texts: z.array(z.string()).min(1).max(MAX_SEGMENTS),
        targetLang: z.string().min(2).max(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isSupportedLanguage(input.targetLang)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported target language." });
      }

      // 20 calls per 10 minutes per IP — enough for a share-page visitor
      // switching languages, useless as a free bulk-translation API.
      if (ctx.env.SESSIONS) {
        const ip = ctx.req.headers.get("cf-connecting-ip") ?? "unknown";
        const { allowed } = await rateLimit(
          ctx.env.SESSIONS,
          `translate:${await sha256Hex(ip)}`,
          20,
          600
        );
        if (!allowed) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many translation requests — try again shortly." });
        }
      }
      const total = input.texts.reduce((n, t) => n + t.length, 0);
      if (total > MAX_TOTAL_CHARS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Too much text to translate at once." });
      }

      const gateway = makeGateway(ctx.env);
      const translated = await gateway.translate({
        texts: input.texts,
        targetLanguage: languageLabel(input.targetLang),
      });
      return { translated, targetLang: input.targetLang };
    }),
});
