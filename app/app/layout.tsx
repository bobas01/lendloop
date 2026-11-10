import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import AppNav from "@/components/AppNav";
import RequireAuth from "@/components/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-10 text-sm text-muted">Chargement de l’espace…</p>
      }
    >
      <RequireAuth>
        <div className="flex min-h-full flex-1 flex-col">
          <SiteHeader />
          <AppNav />
          <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
            {children}
          </div>
        </div>
      </RequireAuth>
    </Suspense>
  );
}
