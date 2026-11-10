export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ts));
}

export function formatCondition(condition: string): string {
  const map: Record<string, string> = {
    new: "Neuf",
    good: "Bon",
    fair: "Correct",
    poor: "Usé",
  };
  return map[condition] ?? condition;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    available: "Disponible",
    lent: "Prêté",
    removed: "Retiré",
    pending: "En attente",
    accepted: "Accepté",
    rejected: "Refusé",
    returned: "Rendu",
  };
  return map[status] ?? status;
}
