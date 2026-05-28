import { router } from "../trpc";
import { authRouter } from "./auth";
import { documentsRouter } from "./documents";
import { businessesRouter } from "./businesses";

export const appRouter = router({
  auth: authRouter,
  documents: documentsRouter,
  businesses: businessesRouter,
});

export type AppRouter = typeof appRouter;
