"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDate, formatStatus } from "@/lib/format";

export default function ReceivedRequestsPage() {
  const requests = useQuery(api.borrowRequests.listReceived);
  const accept = useMutation(api.borrowRequests.accept);
  const reject = useMutation(api.borrowRequests.reject);
  const markReturned = useMutation(api.borrowRequests.markReturned);

  async function run(
    action: () => Promise<unknown>,
  ) {
    try {
      await action();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Demandes reçues</h1>
        <p className="mt-1 text-sm text-muted">
          Accepte, refuse, ou marque un prêt comme rendu.
        </p>
      </div>

      {requests === undefined ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted">Aucune demande reçue.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {requests.map((r) => (
            <li
              key={r._id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{r.toolName}</p>
                <p className="text-sm text-muted">
                  {formatDate(r.startDate)} → {formatDate(r.endDate)} ·{" "}
                  {formatStatus(r.status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-ink"
                      onClick={() => run(() => accept({ requestId: r._id }))}
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface"
                      onClick={() => run(() => reject({ requestId: r._id }))}
                    >
                      Refuser
                    </button>
                  </>
                ) : null}
                {r.status === "accepted" ? (
                  <button
                    type="button"
                    className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface"
                    onClick={() =>
                      run(() => markReturned({ requestId: r._id }))
                    }
                  >
                    Marquer rendu
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
