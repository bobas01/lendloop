"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatCondition, formatStatus } from "@/lib/format";

export default function MyToolsPage() {
  const tools = useQuery(api.tools.listMine);
  const removeTool = useMutation(api.tools.remove);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Mes annonces</h1>
        <p className="mt-1 text-sm text-muted">
          Tes outils publiés. Tu peux retirer une annonce si elle n’est pas
          prêtée.
        </p>
      </div>

      {tools === undefined ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : tools.length === 0 ? (
        <p className="text-sm text-muted">Tu n’as pas encore publié d’outil.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {tools.map((tool) => (
            <li
              key={tool._id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="font-medium">{tool.name}</p>
                <p className="text-sm text-muted">
                  {tool.category} · {formatCondition(tool.condition)} ·{" "}
                  {formatStatus(tool.status)}
                </p>
              </div>
              {tool.status !== "removed" && tool.status !== "lent" ? (
                <button
                  type="button"
                  className="text-sm text-danger hover:underline"
                  onClick={() => {
                    void removeTool({ toolId: tool._id }).catch((err: unknown) =>
                      alert(err instanceof Error ? err.message : "Erreur"),
                    );
                  }}
                >
                  Retirer
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
