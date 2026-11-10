import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  isAdmin,
  isOwner,
  requireUser,
} from "./lib/auth";
import { toolCondition } from "./lib/validators";

const MAX_TOOLS = 100;

function assertOwnToolOrAdmin(user: Doc<"users">, tool: Doc<"tools">) {
  if (!isOwner(user, tool.ownerId) && !isAdmin(user)) {
    throw new Error("Non autorisé à modifier cet outil");
  }
}

/** Vue publique : pas d'info propriétaire. */
function toPublicTool(tool: Doc<"tools">) {
  return {
    _id: tool._id,
    name: tool.name,
    category: tool.category,
  };
}

/** Vue connectée : dispo + détails, sans email du propriétaire. */
function toCatalogTool(tool: Doc<"tools">) {
  return {
    _id: tool._id,
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
    status: tool.status,
    ownerId: tool.ownerId,
  };
}

/**
 * Page publique : nom + catégorie uniquement, outils disponibles.
 */
export const listPublic = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tools: Doc<"tools">[];

    if (args.category) {
      tools = await ctx.db
        .query("tools")
        .withIndex("by_category_and_status", (q) =>
          q.eq("category", args.category!).eq("status", "available"),
        )
        .take(MAX_TOOLS);
    } else {
      tools = await ctx.db
        .query("tools")
        .withIndex("by_status", (q) => q.eq("status", "available"))
        .take(MAX_TOOLS);
    }

    return tools.map(toPublicTool);
  },
});

/**
 * Catalogue connecté : disponibilité + filtre catégorie.
 * Inclut available + lent (pas removed).
 */
export const list = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    let tools: Doc<"tools">[];

    if (args.category) {
      const byCategory = await ctx.db
        .query("tools")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .take(MAX_TOOLS);
      tools = byCategory.filter((t) => t.status !== "removed");
    } else {
      const available = await ctx.db
        .query("tools")
        .withIndex("by_status", (q) => q.eq("status", "available"))
        .take(MAX_TOOLS);
      const lent = await ctx.db
        .query("tools")
        .withIndex("by_status", (q) => q.eq("status", "lent"))
        .take(MAX_TOOLS);
      tools = [...available, ...lent];
    }

    return tools.map(toCatalogTool);
  },
});

/** Mes annonces (y compris removed pour historique). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(MAX_TOOLS);

    return tools.map(toCatalogTool);
  },
});

/** Catégories distinctes pour les filtres UI. */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const available = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .take(MAX_TOOLS);
    const lent = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "lent"))
      .take(MAX_TOOLS);

    const categories = new Set(
      [...available, ...lent].map((tool) => tool.category),
    );
    return [...categories].sort();
  },
});

export const get = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.status === "removed") {
      return null;
    }

    const user = await getCurrentUser(ctx);
    if (!user) {
      return toPublicTool(tool);
    }

    return toCatalogTool(tool);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    condition: toolCondition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const name = args.name.trim();
    const category = args.category.trim();
    const description = args.description.trim();

    if (!name || !category) {
      throw new Error("Nom et catégorie obligatoires");
    }
    if (description.length > 500) {
      throw new Error("Description trop longue (max 500 caractères)");
    }

    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name,
      category,
      condition: args.condition,
      description,
      status: "available",
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    condition: v.optional(toolCondition),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);

    if (!tool || tool.status === "removed") {
      throw new Error("Outil introuvable");
    }

    // Seul le propriétaire peut modifier (l'admin peut supprimer)
    if (!isOwner(user, tool.ownerId)) {
      throw new Error("Seul le propriétaire peut modifier cette annonce");
    }

    const patch: Partial<Doc<"tools">> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Nom obligatoire");
      patch.name = name;
    }
    if (args.category !== undefined) {
      const category = args.category.trim();
      if (!category) throw new Error("Catégorie obligatoire");
      patch.category = category;
    }
    if (args.condition !== undefined) {
      patch.condition = args.condition;
    }
    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length > 500) {
        throw new Error("Description trop longue (max 500 caractères)");
      }
      patch.description = description;
    }

    await ctx.db.patch(args.toolId, patch);
    return args.toolId;
  },
});

/**
 * Soft-delete. Propriétaire ou admin.
 * Un outil prêté ne peut pas être retiré tant que le prêt n'est pas rendu.
 */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);

    if (!tool || tool.status === "removed") {
      throw new Error("Outil introuvable");
    }

    assertOwnToolOrAdmin(user, tool);

    if (tool.status === "lent") {
      throw new Error("Impossible de supprimer un outil actuellement prêté");
    }

    await ctx.db.patch(args.toolId, { status: "removed" });
    return args.toolId;
  },
});
