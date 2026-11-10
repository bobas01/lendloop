# Note production — LendLoop

Ce que je changerais pour une vraie mise en production (hors exercice).

## Auth & rôles
- Premier admin via invitation / bootstrap sécurisé, pas d’édition manuelle dashboard
- Rôles et permissions audités (journal des actions admin)
- Sessions Clerk en prod (`pk_live` / `sk_live`) + domaines autorisés stricts

## Secrets & intégrations
- Rotation périodique du secret HMAC
- Secrets uniquement dans le gestionnaire d’env de la plateforme (Vercel / Convex / n8n), jamais dans Git
- Webhook n8n uniquement en HTTPS public (n8n Cloud ou reverse-proxy), pas de `log://local`
- Rate limiting sur les HTTP actions Convex

## Fiabilité
- File d’attente / retries Convex + alerting sur `automationEvents.status = failed`
- Monitoring (Sentry ou équivalent) front + fonctions Convex
- Backups / export régulier des données Convex
- Tests automatisés sur les règles de permission et le cycle d’emprunt

## Produit & données
- Emails / Slack réels à la place des logs
- Consentement et minimisation des données (RGPD) : durée de conservation, droit à l’effacement
- Pagination systématique des listes (déjà bornées, à industrialiser)
- Soft-delete + purge planifiée

## Infra
- CI (lint, typecheck, build) sur chaque PR
- Preview deployments
- Environnements séparés dev / staging / prod (Clerk + Convex + n8n)
