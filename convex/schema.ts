import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  automationEventStatus,
  automationEventType,
  borrowRequestStatus,
  toolCondition,
  toolStatus,
  userRole,
} from "./lib/validators";

/**
 * Schéma Convex = tables / entités.
 * Les permissions métier seront dans les mutations/queries, pas seulement dans l'UI.
 */
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: userRole,
    trustedLender: v.boolean(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(),
    condition: toolCondition,
    description: v.string(),
    // removed = soft-delete (admin ou propriétaire)
    status: toolStatus,
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_category_and_status", ["category", "status"]),

  borrowRequests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    ownerId: v.id("users"),
    startDate: v.number(), // timestamp ms
    endDate: v.number(), // timestamp ms
    status: borrowRequestStatus,
    lastReminderAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_status_and_end_date", ["status", "endDate"]),

  automationEvents: defineTable({
    borrowRequestId: v.id("borrowRequests"),
    type: automationEventType,
    // Empêche les doublons si n8n rejoue un webhook après échec
    idempotencyKey: v.string(),
    status: automationEventStatus,
    message: v.optional(v.string()),
    payloadHash: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_borrow_request", ["borrowRequestId"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_type_and_status", ["type", "status"]),
});
