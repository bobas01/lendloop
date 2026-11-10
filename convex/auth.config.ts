import { AuthConfig } from "convex/server";

/**
 * Dit à Convex comment valider les tokens Clerk.
 * CLERK_JWT_ISSUER_DOMAIN doit être défini dans le dashboard Convex
 * (ex: https://verb-noun-00.clerk.accounts.dev).
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
