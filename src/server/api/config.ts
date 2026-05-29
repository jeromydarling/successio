/**
 * Config tRPC router — exposes deployment-level config (white-labeling,
 * cloud connectors) to the client. These values are public (picker client
 * IDs / app keys are exposed in the browser by design).
 */

import { router, publicProcedure } from "../trpc";
import { getAssociationConfig } from "@/lib/association";

export const configRouter = router({
  association: publicProcedure.query(({ ctx }) => {
    return getAssociationConfig(ctx.env as unknown as Record<string, string | undefined>);
  }),

  /** Which cloud-storage connectors are configured, with their public keys. */
  connectors: publicProcedure.query(({ ctx }) => {
    const env = ctx.env;
    return {
      dropbox: env.DROPBOX_APP_KEY ? { appKey: env.DROPBOX_APP_KEY } : null,
      google:
        env.GOOGLE_PICKER_API_KEY && env.GOOGLE_OAUTH_CLIENT_ID
          ? { apiKey: env.GOOGLE_PICKER_API_KEY, clientId: env.GOOGLE_OAUTH_CLIENT_ID }
          : null,
      microsoft: env.MS_CLIENT_ID
        ? { clientId: env.MS_CLIENT_ID, tenantId: env.MS_TENANT_ID ?? "common" }
        : null,
    };
  }),
});
