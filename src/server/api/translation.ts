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
