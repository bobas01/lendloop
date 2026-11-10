import { mutation, query } from "./_generated/server";
import { getCurrentUser, getIdentity } from "./lib/auth";

/**
 * Crée ou met à jour le profil local après connexion Clerk.
 * À appeler côté front quand l'utilisateur est authentifié.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getIdentity(ctx);
    if (!identity) {
      throw new Error("Non authentifié");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const email = identity.email;
    const joinedName = [identity.givenName, identity.familyName]
      .filter(Boolean)
      .join(" ");
    const name = identity.name ?? (joinedName || undefined);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name: name || existing.name,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      role: "user",
      trustedLender: false,
    });
  },
});

/** Profil de l'utilisateur connecté (ou null). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
