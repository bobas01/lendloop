# LendLoop

Application de prêt d’outils entre voisins.

**Stack imposée :** Next.js (App Router) · TypeScript · Clerk · Convex · n8n

## État actuel

Init du projet uniquement :

- Next.js 16 + TypeScript + Tailwind
- Clerk branché (`ClerkProvider`, `proxy.ts`)
- Convex préparé (`convex/schema.ts` encore vide, auth Clerk prête)
- n8n prévu via Docker Compose + dossier d’exports workflows

Prochaine feature : **schéma Convex** (équiv. entités / tables).

## Prérequis

- Node.js 20+ (idéal 22.13+)
- Compte [Clerk](https://clerk.com) et [Convex](https://convex.dev)
- Docker (pour n8n local)

## Installation locale

```bash
npm install
cp .env.example .env.local
```

### 1. Clerk

1. Créer une application Clerk
2. Copier Publishable Key + Secret Key dans `.env.local`
3. Activer l’intégration **Convex** dans Clerk et noter le Frontend API URL  
   (ex. `https://verb-noun-00.clerk.accounts.dev`)

Astuce : `npx clerk init --framework next -y` peut aussi écrire les clés en local.

### 2. Convex (obligatoire pour le backend)

```bash
npx convex dev
```

1. Login GitHub, créer le projet LendLoop  
2. Convex écrit `NEXT_PUBLIC_CONVEX_URL` dans `.env.local` et régénère `convex/_generated`  
3. Dans le dashboard Convex → Environment Variables :

```text
CLERK_JWT_ISSUER_DOMAIN=https://ton-frontend-api.clerk.accounts.dev
```

4. Dans Clerk → activer l’intégration Convex (JWT template / integration)

Sans cette étape, le front tourne mais les appels Convex ne fonctionnent pas.

### 3. Lancer l’app

```bash
# terminal 1 — frontend
npm run dev

# terminal 2 — sync Convex (après config)
npm run dev:backend
```

> **Windows / WAMP :** `C:\wamp64\www\lendloop` est un junction vers `D:\www\lendloop`.  
> Utilise toujours `npm run dev` / `npm run dev:backend` (jamais `next dev` / `npx convex dev` bruts depuis le chemin C:), sinon chemins cassés et erreur 500.

### 4. n8n (plus tard)

```bash
npm run n8n:up
# UI : http://localhost:5678
```

## Structure (équivalent mental PHP)

| Ici | Chez toi (PHP) |
|-----|----------------|
| `convex/schema.ts` | Entités / tables Doctrine |
| `convex/*.ts` (queries/mutations) | Contrôleurs / services API |
| `app/` | Twig / vues + routing |
| Clerk | Bundle auth / firewall |
| n8n | Cron + webhooks / messagerie |

## Variables d’environnement

Voir `.env.example`. **Aucun secret dans le code ni dans les exports n8n.**

## Roadmap courte

1. ✅ Init stack + premier push
2. ✅ Schéma Convex (users, tools, borrowRequests, automationEvents) + sync user
3. ✅ Backend outils (CRUD + listes publique/connectée + permissions)
4. ✅ Backend demandes d’emprunt (créer / accepter / refuser / rendu)
5. ✅ Backend admin (tous prêts, trustedLender, suppression globale)
6. ✅ Front (page publique + espace connecté + admin UI)
7. ✅ Automatisations n8n + HMAC + idempotence
8. README final + note prod

## Licence

Projet d’exercice / candidature.
