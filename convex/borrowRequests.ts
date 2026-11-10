import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { isOwner, requireUser } from "./lib/auth";

const MAX_REQUESTS = 100;

function toRequestView(
  request: Doc<"borrowRequests">,
  tool: Doc<"tools"> | null,
) {
  return {
    _id: request._id,
    toolId: request.toolId,
    toolName: tool?.name ?? "(outil supprimé)",
    toolCategory: tool?.category ?? null,
    borrowerId: request.borrowerId,
    ownerId: request.ownerId,
    startDate: request.startDate,
    endDate: request.endDate,
    status: request.status,
    lastReminderAt: request.lastReminderAt,
    reminderCount: request.reminderCount ?? 0,
    _creationTime: request._creationTime,
  };
}

/**
 * Demander à emprunter un outil pour une période.
 * - Outil doit être available
 * - Pas son propre outil
 * - Dates cohérentes
 */
export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const borrower = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);

    if (!tool || tool.status === "removed") {
      throw new Error("Outil introuvable");
    }
    if (tool.status !== "available") {
      throw new Error("Cet outil n'est pas disponible");
    }
    if (isOwner(borrower, tool.ownerId)) {
      throw new Error("Tu ne peux pas emprunter ton propre outil");
    }
    if (args.endDate <= args.startDate) {
      throw new Error("La date de fin doit être après la date de début");
    }

    // Une seule demande pending à la fois sur le même outil par le même emprunteur
    const existing = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))
      .take(MAX_REQUESTS);

    const duplicatePending = existing.find(
      (r) =>
        r.borrowerId === borrower._id &&
        r.status === "pending",
    );
    if (duplicatePending) {
      throw new Error("Tu as déjà une demande en attente pour cet outil");
    }

    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      borrowerId: borrower._id,
      ownerId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      reminderCount: 0,
    });

    // TODO (feature n8n) : appeler le webhook de notification ici
    // (création + plus tard aussi sur accept/reject/returned)

    return requestId;
  },
});

/** Accepter une demande reçue (propriétaire de l'outil uniquement). */
export const accept = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Demande introuvable");
    }
    if (!isOwner(user, request.ownerId)) {
      throw new Error("Seul le propriétaire peut accepter cette demande");
    }
    if (request.status !== "pending") {
      throw new Error("Cette demande n'est plus en attente");
    }

    const tool = await ctx.db.get(request.toolId);
    if (!tool || tool.status !== "available") {
      throw new Error("L'outil n'est plus disponible");
    }

    // Refuser automatiquement les autres demandes pending sur le même outil
    const siblings = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool", (q) => q.eq("toolId", request.toolId))
      .take(MAX_REQUESTS);

    for (const sibling of siblings) {
      if (sibling._id !== request._id && sibling.status === "pending") {
        await ctx.db.patch(sibling._id, { status: "rejected" });
      }
    }

    await ctx.db.patch(request._id, { status: "accepted" });
    await ctx.db.patch(tool._id, { status: "lent" });

    return request._id;
  },
});

/** Refuser une demande reçue (propriétaire uniquement). */
export const reject = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Demande introuvable");
    }
    if (!isOwner(user, request.ownerId)) {
      throw new Error("Seul le propriétaire peut refuser cette demande");
    }
    if (request.status !== "pending") {
      throw new Error("Cette demande n'est plus en attente");
    }

    await ctx.db.patch(request._id, { status: "rejected" });
    return request._id;
  },
});

/**
 * Marquer comme rendu (propriétaire de l'outil).
 * Remet l'outil en available.
 */
export const markReturned = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Demande introuvable");
    }
    if (!isOwner(user, request.ownerId)) {
      throw new Error("Seul le propriétaire peut marquer le prêt comme rendu");
    }
    if (request.status !== "accepted") {
      throw new Error("Seul un prêt accepté peut être marqué comme rendu");
    }

    await ctx.db.patch(request._id, { status: "returned" });

    const tool = await ctx.db.get(request.toolId);
    if (tool && tool.status !== "removed") {
      await ctx.db.patch(tool._id, { status: "available" });
    }

    return request._id;
  },
});

/** Mes demandes d'emprunt (je suis l'emprunteur). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .take(MAX_REQUESTS);

    const views = [];
    for (const request of requests) {
      const tool = await ctx.db.get(request.toolId);
      views.push(toRequestView(request, tool));
    }
    return views;
  },
});

/** Demandes reçues sur mes outils (je suis le propriétaire). */
export const listReceived = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(MAX_REQUESTS);

    const views = [];
    for (const request of requests) {
      const tool = await ctx.db.get(request.toolId);
      views.push(toRequestView(request, tool));
    }
    return views;
  },
});

/** Détail d'une demande (emprunteur, propriétaire, ou admin). */
export const get = query({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const allowed =
      isOwner(user, request.ownerId) ||
      isOwner(user, request.borrowerId) ||
      user.role === "admin";

    if (!allowed) {
      throw new Error("Non autorisé à voir cette demande");
    }

    const tool = await ctx.db.get(request.toolId);
    return toRequestView(request, tool);
  },
});
