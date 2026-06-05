import { router } from "../trpc";
import { authRouter } from "./auth";
import { documentsRouter } from "./documents";
import { businessesRouter } from "./businesses";
import { knowledgeRouter } from "./knowledge";
import { profilesRouter } from "./profiles";
import { adminRouter } from "./admin";
import { historyRouter } from "./history";
import { configRouter } from "./config";
import { legacyRouter } from "./legacy";
import { translationRouter } from "./translation";

export const appRouter = router({
  auth: authRouter,
  documents: documentsRouter,
  businesses: businessesRouter,
  knowledge: knowledgeRouter,
  profiles: profilesRouter,
  admin: adminRouter,
  history: historyRouter,
  config: configRouter,
  legacy: legacyRouter,
  translation: translationRouter,
});

export type AppRouter = typeof appRouter;
