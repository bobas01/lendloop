"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatStatus } from "@/lib/format";

export default function AdminPage() {
  const isAdmin = useQuery(api.admin.meIsAdmin);
  const loans = useQuery(
    api.admin.listAllBorrowRequests,
    isAdmin ? {} : "skip",
  );
  const users = useQuery(api.admin.listUsers, isAdmin ? {} : "skip");
  const tools = useQuery(api.admin.listAllTools, isAdmin ? {} : "skip");
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const removeAnyTool = useMutation(api.admin.removeAnyTool);

  if (isAdmin === undefined) {
    return <p className="text-sm text-muted">Chargement…</p>;
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-danger">
        Accès réservé aux administrateurs.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Tous les prêts, suppression d’annonces, prêteurs de confiance.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Tous les prêts</h2>
        {loans === undefined ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : loans.length === 0 ? (
          <p className="text-sm text-muted">Aucun prêt.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {loans.map((loan) => (
              <li key={loan._id} className="py-3 text-sm">
                <p className="font-medium text-foreground">{loan.toolName}</p>
                <p className="text-muted">
                  {loan.borrowerName} ← {loan.ownerName} ·{" "}
                  {formatDate(loan.startDate)} → {formatDate(loan.endDate)} ·{" "}
                  {formatStatus(loan.status)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Utilisateurs</h2>
        {users === undefined ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {users.map((user) => (
              <li
                key={user._id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {user.name ?? user.email ?? user._id}
                  </p>
                  <p className="text-muted">
                    {user.role}
                    {user.trustedLender ? " · prêteur de confiance" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-accent-ink hover:underline"
                  onClick={() => {
                    void setTrusted({
                      userId: user._id,
                      trusted: !user.trustedLender,
                    }).catch((err: unknown) =>
                      alert(err instanceof Error ? err.message : "Erreur"),
                    );
                  }}
                >
                  {user.trustedLender
                    ? "Retirer confiance"
                    : "Attribuer confiance"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Outils</h2>
        {tools === undefined ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {tools.map((tool) => (
              <li
                key={tool._id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium">{tool.name}</p>
                  <p className="text-muted">
                    {tool.category} · {formatStatus(tool.status)}
                  </p>
                </div>
                {tool.status !== "removed" && tool.status !== "lent" ? (
                  <button
                    type="button"
                    className="text-sm text-danger hover:underline"
                    onClick={() => {
                      void removeAnyTool({ toolId: tool._id }).catch(
                        (err: unknown) =>
                          alert(err instanceof Error ? err.message : "Erreur"),
                      );
                    }}
                  >
                    Supprimer
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
