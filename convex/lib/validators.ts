import { v } from "convex/values";

/** Réutilisés dans schema + args des mutations (évite la duplication). */
export const userRole = v.union(v.literal("user"), v.literal("admin"));

export const toolCondition = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("poor"),
);

export const toolStatus = v.union(
  v.literal("available"),
  v.literal("lent"),
  v.literal("removed"),
);

export const borrowRequestStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("returned"),
);

export const automationEventType = v.union(
  v.literal("borrow_notification"),
  v.literal("status_notification"),
  v.literal("overdue_reminder"),
);

export const automationEventStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed"),
);
