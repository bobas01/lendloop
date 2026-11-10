"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatStatus } from "@/lib/format";

export default function MyRequestsPage() {
  const requests = useQuery(api.borrowRequests.listMine);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Mes demandes</h1>
        <p className="mt-1 text-sm text-muted">
          Les emprunts que tu as demandés.
        </p>
      </div>

      {requests === undefined ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted">Aucune demande pour l’instant.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {requests.map((r) => (
            <li key={r._id} className="py-4">
              <p className="font-medium">{r.toolName}</p>
              <p className="text-sm text-muted">
                {formatDate(r.startDate)} → {formatDate(r.endDate)} ·{" "}
                {formatStatus(r.status)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
