import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const MAX = 200;

/** Prêts acceptés dont la date de fin est dépassée. */
export const listOverdueInternal = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const accepted = await ctx.db
      .query("borrowRequests")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .take(MAX);

    const overdue = accepted.filter((r) => r.endDate < args.now);
    const rows = [];

    for (const request of overdue) {
      const borrower = await ctx.db.get(request.borrowerId);
      const tool = await ctx.db.get(request.toolId);
      rows.push({
        requestId: request._id,
        endDate: request.endDate,
        toolName: tool?.name ?? null,
        borrowerEmail: borrower?.email ?? null,
        borrowerName: borrower?.name ?? null,
        lastReminderAt: request.lastReminderAt ?? null,
        reminderCount: request.reminderCount ?? 0,
      });
    }
    return rows;
  },
});

/**
 * Marque qu'un rappel a été envoyé (idempotent par jour).
 * idempotencyKey typique : overdue_reminder:{requestId}:{YYYY-MM-DD}
 */
export const markReminderSent = internalMutation({
  args: {
    requestId: v.id("borrowRequests"),
    idempotencyKey: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();

    if (existing?.status === "sent") {
      return { ok: true, duplicate: true };
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Demande introuvable");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      lastReminderAt: now,
      reminderCount: (request.reminderCount ?? 0) + 1,
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "sent",
        message: args.message ?? "reminder sent",
        sentAt: now,
      });
    } else {
      await ctx.db.insert("automationEvents", {
        borrowRequestId: args.requestId,
        type: "overdue_reminder",
        idempotencyKey: args.idempotencyKey,
        status: "sent",
        message: args.message ?? "reminder sent",
        sentAt: now,
      });
    }

    return { ok: true, duplicate: false };
  },
});

/** Vue admin / debug des prêts en retard. */
export const listOverdue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const accepted = await ctx.db
      .query("borrowRequests")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .take(MAX);
    return accepted.filter((r) => r.endDate < now);
  },
});
