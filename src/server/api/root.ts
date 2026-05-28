import { router } from "../trpc";
import { authRouter } from "./auth";
import { documentsRouter } from "./documents";
import { businessesRouter } from "./businesses";
import { knowledgeRouter } from "./knowledge";
import { profilesRouter } from "./profiles";

export const appRouter = router({
  auth: authRouter,
  documents: documentsRouter,
  businesses: businessesRouter,
  knowledge: knowledgeRouter,
  profiles: profilesRouter,
});

export type AppRouter = typeof appRouter;
