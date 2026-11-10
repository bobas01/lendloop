"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatCondition, formatStatus } from "@/lib/format";

export default function CatalogPage() {
  const [category, setCategory] = useState<string>("");
  const [borrowToolId, setBorrowToolId] = useState<Id<"tools"> | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const me = useQuery(api.users.me);
  const categories = useQuery(api.tools.listCategories);
  const tools = useQuery(api.tools.list, {
    category: category || undefined,
  });
  const createRequest = useMutation(api.borrowRequests.create);

  async function onBorrow(e: FormEvent) {
    e.preventDefault();
    if (!borrowToolId || !startDate || !endDate) return;
    setError(null);
    setOk(null);
    try {
      await createRequest({
        toolId: borrowToolId,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
      });
      setOk("Demande envoyée.");
      setBorrowToolId(null);
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Catalogue</h1>
        <p className="mt-1 text-sm text-muted">
          Filtre par catégorie et demande un emprunt.
        </p>
      </div>

      <label className="flex max-w-xs flex-col gap-1 text-sm">
        <span className="text-muted">Catégorie</span>
        <select
          className="rounded-md border border-line bg-surface px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Toutes</option>
          {(categories ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {ok ? <p className="text-sm text-ok">{ok}</p> : null}

      {tools === undefined ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : tools.length === 0 ? (
        <p className="text-sm text-muted">Aucun outil dans cette catégorie.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {tools.map((tool) => {
            const mine = me && tool.ownerId === me._id;
            return (
              <li key={tool._id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-sm text-muted">
                      {tool.category} · {formatCondition(tool.condition)} ·{" "}
                      {formatStatus(tool.status)}
                    </p>
                  </div>
                  {!mine && tool.status === "available" ? (
                    <button
                      type="button"
                      className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface"
                      onClick={() => setBorrowToolId(tool._id)}
                    >
                      Emprunter
                    </button>
                  ) : null}
                  {mine ? (
                    <span className="text-xs text-muted">Ton annonce</span>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{tool.description}</p>
              </li>
            );
          })}
        </ul>
      )}

      {borrowToolId ? (
        <form
          onSubmit={onBorrow}
          className="flex flex-col gap-3 border border-line bg-surface p-4"
        >
          <p className="font-medium">Période d’emprunt</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Début
              <input
                type="date"
                required
                className="rounded-md border border-line bg-background px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Fin
              <input
                type="date"
                required
                className="rounded-md border border-line bg-background px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
            >
              Envoyer la demande
            </button>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm text-muted hover:underline"
              onClick={() => setBorrowToolId(null)}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
