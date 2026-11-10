import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getSharedSecret, verifySignature } from "./lib/hmac";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * GET /overdue-loans
 * Appelé chaque jour par n8n. Protégé par HMAC (body vide).
 */
http.route({
  path: "/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const secret = getSharedSecret();
    if (!secret) {
      return json({ error: "Secret non configuré" }, 500);
    }

    const verified = await verifySignature({
      secret,
      body: "",
      timestampHeader: request.headers.get("X-LendLoop-Timestamp"),
      signatureHeader: request.headers.get("X-LendLoop-Signature"),
    });
    if (!verified.ok) {
      return json({ error: verified.reason }, 401);
    }

    const loans = await ctx.runQuery(internal.reminders.listOverdueInternal, {
      now: Date.now(),
    });
    return json({ loans, count: loans.length });
  }),
});

/**
 * POST /reminders/ack
 * Body: { requestId, idempotencyKey, message? }
 * n8n confirme qu'un rappel a été effectué.
 */
http.route({
  path: "/reminders/ack",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = getSharedSecret();
    if (!secret) {
      return json({ error: "Secret non configuré" }, 500);
    }

    const rawBody = await request.text();
    const verified = await verifySignature({
      secret,
      body: rawBody,
      timestampHeader: request.headers.get("X-LendLoop-Timestamp"),
      signatureHeader: request.headers.get("X-LendLoop-Signature"),
    });
    if (!verified.ok) {
      return json({ error: verified.reason }, 401);
    }

    let payload: {
      requestId?: string;
      idempotencyKey?: string;
      message?: string;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "JSON invalide" }, 400);
    }

    if (!payload.requestId || !payload.idempotencyKey) {
      return json({ error: "requestId et idempotencyKey requis" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.reminders.markReminderSent, {
        requestId: payload.requestId as Id<"borrowRequests">,
        idempotencyKey: payload.idempotencyKey,
        message: payload.message,
      });
      return json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "error";
      return json({ error: message }, 400);
    }
  }),
});

export default http;
