import { Suspense } from "react";
import AuthHeader from "@/components/AuthHeader";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between px-6 py-4">
        <p className="text-lg font-semibold tracking-tight text-zinc-900">
          LendLoop
        </p>
        <Suspense fallback={<div className="h-9 w-28 rounded-md bg-zinc-200" />}>
          <AuthHeader />
        </Suspense>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 pb-16">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          LendLoop
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          Une petite app de voisinage pour publier, emprunter et rendre des
          outils — construite avec Next.js, Clerk, Convex et n8n.
        </p>
        <p className="text-sm text-zinc-500">
          Stack initialisée. Prochaine étape : schéma Convex (entités) puis
          features backend une par une.
        </p>
      </main>
    </div>
  );
}
