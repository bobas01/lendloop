import SiteHeader from "@/components/SiteHeader";
import PublicToolsList from "@/components/PublicToolsList";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pb-20 pt-8">
        <section className="flex flex-col gap-4">
          <p className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            LendLoop
          </p>
          <p className="max-w-xl text-lg text-muted">
            Empruntez la perceuse du voisin, prêtez votre échelle — simple,
            local, entre habitants.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Outils disponibles
          </h2>
          <p className="text-sm text-muted">
            Aperçu public : nom et catégorie uniquement. Connecte-toi pour
            emprunter ou publier.
          </p>
          <PublicToolsList />
        </section>
      </main>
    </div>
  );
}
