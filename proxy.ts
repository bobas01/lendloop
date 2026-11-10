import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16: le fichier s'appelle proxy.ts (anciennement middleware.ts).
// Par défaut, aucune route n'est protégée ici : les permissions métier
// seront vérifiées côté Convex (backend), pas seulement dans l'UI.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
