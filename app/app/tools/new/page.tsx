"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const CONDITIONS = [
  { value: "new", label: "Neuf" },
  { value: "good", label: "Bon" },
  { value: "fair", label: "Correct" },
  { value: "poor", label: "Usé" },
] as const;

export default function NewToolPage() {
  const router = useRouter();
  const createTool = useMutation(api.tools.create);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      await createTool({
        name: String(form.get("name") ?? ""),
        category: String(form.get("category") ?? ""),
        condition: String(form.get("condition") ?? "good") as
          | "new"
          | "good"
          | "fair"
          | "poor",
        description: String(form.get("description") ?? ""),
      });
      router.push("/app/my-tools");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Publier un outil</h1>
        <p className="mt-1 text-sm text-muted">
          Nom, catégorie, état et une courte description.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nom
          <input
            name="name"
            required
            className="rounded-md border border-line bg-surface px-3 py-2"
            placeholder="Perceuse Bosch"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Catégorie
          <input
            name="category"
            required
            className="rounded-md border border-line bg-surface px-3 py-2"
            placeholder="Bricolage"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          État
          <select
            name="condition"
            defaultValue="good"
            className="rounded-md border border-line bg-surface px-3 py-2"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            required
            rows={4}
            maxLength={500}
            className="rounded-md border border-line bg-surface px-3 py-2"
            placeholder="Courte description pour les voisins…"
          />
        </label>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60"
        >
          {pending ? "Publication…" : "Publier"}
        </button>
      </form>
    </div>
  );
}
