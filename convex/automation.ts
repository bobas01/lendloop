import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getSharedSecret, signPayload } from "./lib/hmac";
import { requireUser, isOwner } from "./lib/auth";
import { automationEventType } from "./lib/validators";

/**
 * Enregistre (ou réutilise) un événement d'automation idempotent.
 * Si déjà "sent" avec la même clé → ne rien renvoyer (évite doublons).
 */
export const beginEvent = internalMutation({
  args: {
    borrowRequestId: v.id("borrowRequests"),
    type: automationEventType,
    idempotencyKey: v.string(),
    payloadHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();

    if (existing) {
      if (existing.status === "sent") {
        return { eventId: existing._id, skip: true, alreadySent: true };
      }
      // failed ou pending abandonné → on retente
      await ctx.db.patch(existing._id, {
        status: "pending",
        message: undefined,
        payloadHash: args.payloadHash,
      });
      return { eventId: existing._id, skip: false, alreadySent: false };
    }

    const eventId = await ctx.db.insert("automationEvents", {
      borrowRequestId: args.borrowRequestId,
      type: args.type,
      idempotencyKey: args.idempotencyKey,
      status: "pending",
      payloadHash: args.payloadHash,
    });

    return { eventId, skip: false, alreadySent: false };
  },
});

export const completeEvent = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      status: args.status,
      message: args.message,
      sentAt: args.status === "sent" ? Date.now() : undefined,
    });
  },
});

export const getBorrowEventContext = internalQuery({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const tool = await ctx.db.get(request.toolId);
    const borrower = await ctx.db.get(request.borrowerId);
    const owner = await ctx.db.get(request.ownerId);

    return {
      request,
      toolName: tool?.name ?? null,
      // Données minimales pour la notif (pas de description longue)
      notifyEmail:
        request.status === "pending"
          ? owner?.email
          : borrower?.email,
      notifyName:
        request.status === "pending"
          ? owner?.name
          : borrower?.name,
      counterpartEmail:
        request.status === "pending"
          ? borrower?.email
          : owner?.email,
    };
  },
});

/**
 * Action : signe et envoie le webhook n8n.
 * Appelée via scheduler après create/accept/reject/returned.
 */
export const dispatchBorrowEvent = internalAction({
  args: {
    requestId: v.id("borrowRequests"),
    eventType: automationEventType,
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = getSharedSecret();
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!secret || !webhookUrl) {
      console.error(
        "[automation] N8N_SHARED_SECRET ou N8N_WEBHOOK_URL manquant — skip",
      );
      return { ok: false, reason: "env_missing" };
    }

    const data = await ctx.runQuery(internal.automation.getBorrowEventContext, {
      requestId: args.requestId,
    });
    if (!data) {
      return { ok: false, reason: "not_found" };
    }

    const idempotencyKey = `${args.requestId}:${args.status}:${args.eventType}`;
    const bodyObj = {
      eventType: args.eventType,
      status: args.status,
      requestId: args.requestId,
      toolName: data.toolName,
      notifyEmail: data.notifyEmail ?? null,
      notifyName: data.notifyName ?? null,
      startDate: data.request.startDate,
      endDate: data.request.endDate,
      idempotencyKey,
    };
    const body = JSON.stringify(bodyObj);

    const begin = await ctx.runMutation(internal.automation.beginEvent, {
      borrowRequestId: args.requestId,
      type: args.eventType,
      idempotencyKey,
      payloadHash: idempotencyKey,
    });

    if (begin.skip) {
      console.log("[automation] skip idempotent", idempotencyKey);
      return { ok: true, skipped: true };
    }

    try {
      // Mode démo sans n8n public : N8N_WEBHOOK_URL=log://local
      // (Convex Cloud ne peut pas appeler localhost)
      if (webhookUrl.startsWith("log://")) {
        console.log("[automation] NOTIFICATION (log-only)", bodyObj);
        await ctx.runMutation(internal.automation.completeEvent, {
          eventId: begin.eventId,
          status: "sent",
          message: "log-only notification",
        });
        return { ok: true, logOnly: true };
      }

      const { timestamp, signature } = await signPayload(secret, body);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LendLoop-Timestamp": timestamp,
          "X-LendLoop-Signature": signature,
          "X-LendLoop-Idempotency-Key": idempotencyKey,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        await ctx.runMutation(internal.automation.completeEvent, {
          eventId: begin.eventId,
          status: "failed",
          message: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        });
        console.error("[automation] webhook failed", res.status, text);
        return { ok: false, reason: "http_error" };
      }

      await ctx.runMutation(internal.automation.completeEvent, {
        eventId: begin.eventId,
        status: "sent",
        message: "webhook ok",
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      await ctx.runMutation(internal.automation.completeEvent, {
        eventId: begin.eventId,
        status: "failed",
        message,
      });
      console.error("[automation] webhook exception", message);
      return { ok: false, reason: message };
    }
  },
});

/** Historique des automations d'un prêt (bonus UI). */
export const listForRequest = query({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) return [];

    const allowed =
      isOwner(user, request.ownerId) ||
      isOwner(user, request.borrowerId) ||
      user.role === "admin";
    if (!allowed) {
      throw new Error("Non autorisé");
    }

    return await ctx.db
      .query("automationEvents")
      .withIndex("by_borrow_request", (q) =>
        q.eq("borrowRequestId", args.requestId),
      )
      .take(50);
  },
});
