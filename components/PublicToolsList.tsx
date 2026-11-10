"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function PublicToolsList() {
  const enabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const tools = useQuery(api.tools.listPublic, enabled ? {} : "skip");

  if (!enabled) {
    return (
      <p className="text-sm text-muted">
        Convex n’est pas configuré (NEXT_PUBLIC_CONVEX_URL manquant).
      </p>
    );
  }

  if (tools === undefined) {
    return <p className="text-sm text-muted">Chargement des outils…</p>;
  }

  if (tools.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun outil disponible pour le moment. Connecte-toi pour en publier un.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {tools.map((tool) => (
        <li
          key={tool._id}
          className="flex items-baseline justify-between gap-4 py-3"
        >
          <span className="font-medium text-foreground">{tool.name}</span>
          <span className="text-sm text-muted">{tool.category}</span>
        </li>
      ))}
    </ul>
  );
}
