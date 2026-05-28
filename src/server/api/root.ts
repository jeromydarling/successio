import { router } from "../trpc";
import { authRouter } from "./auth";
import { documentsRouter } from "./documents";
import { businessesRouter } from "./businesses";
import { knowledgeRouter } from "./knowledge";
import { profilesRouter } from "./profiles";
import { adminRouter } from "./admin";

export const appRouter = router({
  auth: authRouter,
  documents: documentsRouter,
  businesses: businessesRouter,
  knowledge: knowledgeRouter,
  profiles: profilesRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
