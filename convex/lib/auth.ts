import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** Identité Clerk brute (JWT). null si non connecté. */
export async function getIdentity(ctx: Ctx) {
  return await ctx.auth.getUserIdentity();
}

/** Utilisateur LendLoop en base, lié au compte Clerk. */
export async function getCurrentUser(
  ctx: Ctx,
): Promise<Doc<"users"> | null> {
  const identity = await getIdentity(ctx);
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Non authentifié");
  }
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Accès administrateur requis");
  }
  return user;
}

export function isAdmin(user: Doc<"users">): boolean {
  return user.role === "admin";
}

export function isOwner(
  user: Doc<"users">,
  ownerId: Doc<"users">["_id"],
): boolean {
  return user._id === ownerId;
}
