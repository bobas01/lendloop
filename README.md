# LendLoop

Application web de prêt d’outils entre voisins.

**Stack :** Next.js (App Router) · TypeScript · Clerk · Convex · n8n

---

## Fonctionnalités

### Public (sans compte)
- Marque **LendLoop** + phrase de présentation
- Liste des outils disponibles : **nom + catégorie uniquement** (pas d’info propriétaire)
- Bouton de connexion Clerk

### Connecté
- Publier un outil (nom, catégorie, état, description)
- Catalogue avec disponibilité + filtre par catégorie
- Demander un emprunt sur une période
- Accepter / refuser les demandes reçues
- Marquer un prêt comme rendu
- Trois vues : mes annonces · mes demandes · demandes reçues

### Administrateur
- Supprimer n’importe quelle annonce
- Voir tous les prêts
- Attribuer le statut « prêteur de confiance »
- Permissions **vérifiées côté Convex** (pas seulement masquées dans l’UI)

### Automatisations
1. Notification à la création / changement de statut d’une demande (webhook n8n signé)
2. Rappel quotidien des prêts en retard (cron n8n → HTTP Convex → ack)

---

## Architecture

```
Navigateur
   │
   ▼
Next.js (App Router)  ← UI + Clerk session
   │
   ▼
Convex                ← données + règles métier + HTTP actions
   │
   ├── webhook HMAC ──► n8n (notif)
   │
   └── HTTP /overdue-loans ◄── n8n cron
       HTTP /reminders/ack ──► Convex (idempotent)
```

| Couche | Rôle |
|--------|------|
| `app/` | Pages Next.js |
| `convex/schema.ts` | Tables |
| `convex/*.ts` | Queries / mutations / actions |
| `convex/http.ts` | API HTTP pour n8n |
| `n8n/workflows/*.json` | Exports workflows (sans secrets) |
| Clerk | Identité |
| Convex | Source de vérité + autorisations |

---

## Prérequis

- Node.js 20+ (22.13+ recommandé)
- Compte [Clerk](https://clerk.com) et [Convex](https://convex.dev)
- Docker Desktop (optionnel, pour n8n local)
- Compte n8n Cloud **ou** tunnel (ngrok) si tu veux un vrai webhook depuis Convex Cloud

---

## Installation locale

```bash
npm install
cp .env.example .env.local
```

### 1. Clerk

1. Créer une application Clerk  
2. Copier Publishable Key + Secret Key dans `.env.local`  
3. Activer l’intégration **Convex** dans Clerk  
4. Noter le Frontend API URL (ex. `https://verb-noun-00.clerk.accounts.dev`)

Astuce : `npx clerk init --framework next -y`

### 2. Convex

```bash
npm run dev:backend
```

Au premier lancement : login, créer le projet. Convex remplit `NEXT_PUBLIC_CONVEX_URL` et `NEXT_PUBLIC_CONVEX_SITE_URL` dans `.env.local`.

Variables Convex (dashboard ou CLI) :

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://TON_FRONTEND_API.clerk.accounts.dev"
npx convex env set N8N_SHARED_SECRET "une-longue-chaine-secrete"
# Démo sans tunnel public :
npx convex env set N8N_WEBHOOK_URL "log://local"
# Ou webhook n8n public :
# npx convex env set N8N_WEBHOOK_URL "https://xxx/webhook/lendloop-borrow-events"
```

### 3. Lancer le front

```bash
npm run dev
# http://localhost:3000
```

> **Windows / WAMP :** si le projet est un junction (`C:\wamp64\www\...` → `D:\...`), utilise toujours `npm run dev` / `npm run dev:backend` (scripts `run-from-realpath`), jamais `next dev` brut depuis le chemin C: — sinon erreur 500 sur des chemins `.next` invalides.

### 4. Devenir admin (une fois)

1. Se connecter sur l’app (crée la ligne `users`)  
2. Dashboard Convex → Data → `users` → `role: "admin"`

### 5. n8n (optionnel)

```bash
npm run n8n:up
# http://localhost:5678
```

1. Importer `n8n/workflows/*.json`  
2. Configurer `LENDLOOP_HMAC_SECRET` (= `N8N_SHARED_SECRET`) et `CONVEX_SITE_URL`  
3. Activer les workflows  

Détails : [`n8n/README.md`](./n8n/README.md)

**Important :** Convex Cloud ne peut pas appeler `http://localhost:5678`. Utilise `log://local`, n8n Cloud, ou un tunnel.

---

## Variables d’environnement

Voir [`.env.example`](./.env.example).

| Variable | Où | Rôle |
|----------|-----|------|
| `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` | `.env.local` | Auth Clerk |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Client Convex |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `.env.local` | Base HTTP actions |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex env | Validation JWT |
| `N8N_SHARED_SECRET` | Convex + n8n | HMAC partagé |
| `N8N_WEBHOOK_URL` | Convex env | Cible notifs (`log://local` ou URL publique) |

**Aucun secret dans le code ni dans les exports n8n.**

---

## Sécurité & limitation des données

### Autorisations (backend)
- `requireUser` / `requireAdmin` / `isOwner` dans les mutations Convex  
- L’UI peut masquer des boutons ; le serveur refuse quand même les appels non autorisés  

### Données exposées
- API publique `tools.listPublic` : **uniquement** `_id`, `name`, `category`  
- Pas d’email / nom de propriétaire côté visiteur  
- Payloads n8n minimaux (ids, statut, email de notification, nom d’outil)  

### Échanges Convex ↔ n8n
- HMAC-SHA256 sur `${timestamp}.${body}`  
- Headers `X-LendLoop-Timestamp` + `X-LendLoop-Signature`  
- Fenêtre anti-rejeu ~5 minutes  
- Idempotence via `automationEvents.idempotencyKey`  
- Retries n8n sur l’ack rappel ; erreurs visibles dans les exécutions n8n + statut `failed` Convex  

---

## Scripts npm utiles

| Script | Rôle |
|--------|------|
| `npm run dev` | Front Next (chemin réel) |
| `npm run dev:backend` | Sync Convex |
| `npm run n8n:up` / `n8n:down` | Docker n8n |
| `npm run build` | Build production |

---

## Note production

Voir [`NOTE_PROD.md`](./NOTE_PROD.md) — ce qui changerait pour une vraie mise en production.

---

## Structure du dépôt

```
app/                 # Pages Next.js
components/          # UI React
convex/              # Backend (schema, API, http, automations)
n8n/workflows/       # Exports JSON n8n
scripts/             # Helpers Windows / Convex
patches/             # patch-package (workaround Convex Windows)
```

---

## Licence

Projet d’exercice / candidature.
