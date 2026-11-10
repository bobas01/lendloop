"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Après login Clerk, crée/met à jour la ligne `users` dans Convex.
 * À placer une fois dans le layout connecté (ou le layout racine).
 */
export default function EnsureUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const synced = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || synced.current) return;

    synced.current = true;
    void ensureUser().catch((error: unknown) => {
      synced.current = false;
      console.error("ensureUser failed", error);
    });
  }, [isAuthenticated, isLoading, ensureUser]);

  return null;
}
