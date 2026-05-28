/**
 * Config tRPC router — exposes deployment-level config (white-labeling) to the
 * client. Public: the association branding is not sensitive.
 */

import { router, publicProcedure } from "../trpc";
import { getAssociationConfig } from "@/lib/association";

export const configRouter = router({
  association: publicProcedure.query(({ ctx }) => {
    return getAssociationConfig(ctx.env as unknown as Record<string, string | undefined>);
  }),
});
