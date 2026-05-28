/**
 * Knowledge Capture tRPC router — Phase 4.
 * Handles voice upload presigned URLs, Whisper transcription,
 * Claude SOP generation, and CRUD for the SOP library.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { processes, organizations } from "@/db/schema";
import { makeGateway, MODELS } from "@/lib/ai-gateway";
import { presignR2Url, r2CredentialsFromEnv } from "@/lib/r2-presign";
import { buildSopPrompt } from "@/prompts/manufacturing/sop";
import { nanoid } from "@/lib/nanoid";

const sopSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()),
  owner: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const knowledgeRouter = router({
  /** Step 1: Get a presigned URL to PUT audio directly to R2. */
  requestAudioUpload: protectedProcedure
    .input(z.object({ filename: z.string().min(1).max(255), mimeType: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;
      const safe = input.filename.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200);
      const r2Key = `audio/${orgId}/${nanoid()}-${safe}`;

      const uploadUrl = await presignR2Url(
        r2CredentialsFromEnv(ctx.env),
        "PUT",
        r2Key,
        3600
      );

      return { r2Key, uploadUrl };
    }),

  /**
   * Step 2: Given a completed audio upload in R2, run Whisper transcription
   * and then Claude SOP generation. Returns the drafted SOP for user review.
   */
  processRecording: protectedProcedure
    .input(
      z.object({
        r2Key: z.string(),
        question: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;

      // Fetch audio from R2
      const obj = await ctx.env.DOCUMENTS.get(input.r2Key);
      if (!obj) throw new TRPCError({ code: "NOT_FOUND", message: "Audio file not found in R2" });

      // Transcribe via Workers AI Whisper
      const audioBytes = await obj.arrayBuffer();
      const whisperResult = await (ctx.env.AI as any).run("@cf/openai/whisper", {
        audio: [...new Uint8Array(audioBytes)],
      }) as { text: string };
      const transcript = whisperResult.text?.trim() ?? "";

      if (!transcript) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Whisper returned empty transcript" });
      }

      // Fetch org name for context
      const org = await ctx.db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .get();

      // Generate SOP via Claude
      const gateway = makeGateway(ctx.env as any);
      const prompt = buildSopPrompt({
        transcript,
        question: input.question,
        orgName: org?.name,
      });

      const result = await gateway.complete({
        model: MODELS.extraction,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0,
      });

      const cleaned = result.content.replace(/^```json\s*/m, "").replace(/\s*```$/m, "").trim();
      const sop = sopSchema.parse(JSON.parse(cleaned));

      return { transcript, sop };
    }),

  /** Save a (possibly user-edited) SOP to the processes table. */
  saveSop: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        steps: z.array(z.string()).min(1),
        owner: z.string().max(200).optional(),
        notes: z.string().max(2000).optional(),
        source: z.enum(["voice", "manual", "extracted"]).default("voice"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orgId } = ctx.session;
      const id = nanoid();

      await ctx.db.insert(processes).values({
        id,
        orgId,
        title: input.title,
        steps: JSON.stringify(input.steps),
        owner: input.owner,
        source: input.source,
      });

      return { id };
    }),

  /** List all SOPs for the org. */
  listSops: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(processes)
      .where(eq(processes.orgId, ctx.session.orgId))
      .orderBy(desc(processes.createdAt))
      .all();

    return rows.map((r) => ({
      ...r,
      steps: (() => {
        try { return JSON.parse(r.steps) as string[]; } catch { return [r.steps]; }
      })(),
    }));
  }),

  /** Update a SOP. */
  updateSop: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        steps: z.array(z.string()).min(1).optional(),
        owner: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, steps, ...rest } = input;
      await ctx.db
        .update(processes)
        .set({
          ...rest,
          ...(steps ? { steps: JSON.stringify(steps) } : {}),
        })
        .where(
          and(eq(processes.id, id), eq(processes.orgId, ctx.session.orgId))
        );
      return { success: true };
    }),

  /** Delete a SOP. */
  deleteSop: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(processes)
        .where(
          and(eq(processes.id, input.id), eq(processes.orgId, ctx.session.orgId))
        );
      return { success: true };
    }),
});
