import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAdmin } from "./lib/auth";
import { userRole } from "./lib/validators";

const MAX_ROWS = 200;

/**
 * Pour l'UI : savoir si l'utilisateur courant est admin.
 * La vraie sécu reste dans chaque mutation (requireAdmin).
 */
export const meIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user?.role === "admin";
  },
});

/** Liste tous les utilisateurs (admin). */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(MAX_ROWS);
    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      trustedLender: user.trustedLender,
    }));
  },
});

/**
 * Tous les prêts / demandes (admin).
 * Enrichis avec le nom de l'outil.
 */
export const listAllBorrowRequests = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("returned"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let requests: Doc<"borrowRequests">[];

    if (args.status) {
      requests = await ctx.db
        .query("borrowRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(MAX_ROWS);
    } else {
      requests = await ctx.db.query("borrowRequests").take(MAX_ROWS);
    }

    const views = [];
    for (const request of requests) {
      const tool = await ctx.db.get(request.toolId);
      const borrower = await ctx.db.get(request.borrowerId);
      const owner = await ctx.db.get(request.ownerId);
      views.push({
        _id: request._id,
        toolId: request.toolId,
        toolName: tool?.name ?? "(outil supprimé)",
        borrowerId: request.borrowerId,
        borrowerName: borrower?.name ?? borrower?.email ?? "?",
        ownerId: request.ownerId,
        ownerName: owner?.name ?? owner?.email ?? "?",
        startDate: request.startDate,
        endDate: request.endDate,
        status: request.status,
        lastReminderAt: request.lastReminderAt,
        reminderCount: request.reminderCount ?? 0,
        _creationTime: request._creationTime,
      });
    }
    return views;
  },
});

/**
 * Attribuer / retirer le statut "prêteur de confiance".
 */
export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    trusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("Utilisateur introuvable");
    }

    await ctx.db.patch(args.userId, { trustedLender: args.trusted });
    return args.userId;
  },
});

/**
 * Changer le rôle d'un utilisateur (admin seulement).
 * Pour devenir le PREMIER admin : passe par le dashboard Convex
 * (éditer le document users → role: "admin").
 */
export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRole,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("Utilisateur introuvable");
    }

    // Empêche de se retirer le dernier rôle admin par accident
    if (
      target._id === admin._id &&
      target.role === "admin" &&
      args.role !== "admin"
    ) {
      throw new Error("Tu ne peux pas retirer ton propre rôle admin");
    }

    await ctx.db.patch(args.userId, { role: args.role });
    return args.userId;
  },
});

/**
 * Soft-delete n'importe quelle annonce (admin).
 * Même règle métier : pas si l'outil est actuellement prêté.
 */
export const removeAnyTool = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(args.toolId);

    if (!tool || tool.status === "removed") {
      throw new Error("Outil introuvable");
    }
    if (tool.status === "lent") {
      throw new Error("Impossible de supprimer un outil actuellement prêté");
    }

    await ctx.db.patch(args.toolId, { status: "removed" });
    return args.toolId;
  },
});

/** Catalogue complet des outils pour l'admin (y compris removed). */
export const listAllTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const tools = await ctx.db.query("tools").take(MAX_ROWS);
    return tools.map((tool) => ({
      _id: tool._id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      description: tool.description,
      status: tool.status,
      ownerId: tool.ownerId,
    }));
  },
});
