# Workflows n8n — LendLoop

## Fichiers

| Fichier | Rôle |
|---------|------|
| `workflows/borrow-request-notification.json` | Webhook signé → log notif |
| `workflows/overdue-loan-reminders.json` | Cron 09:00 → overdue → rappel → ack |

**Aucun secret dans ces JSON.**

## Démarrer n8n

```bash
npm run n8n:up
# UI http://localhost:5678
```

Dans n8n → Variables / env du container :

- `LENDLOOP_HMAC_SECRET` = même valeur que `N8N_SHARED_SECRET` côté Convex
- `CONVEX_SITE_URL` = `https://<ton-deploy>.convex.site` (voir `.env.local` → `NEXT_PUBLIC_CONVEX_SITE_URL`)

Importer les 2 JSON (Import from File), activer les workflows.

## Convex (variables dashboard / CLI)

```bash
npx convex env set N8N_SHARED_SECRET "une-longue-chaine-secrete"
# Démo sans tunnel public :
npx convex env set N8N_WEBHOOK_URL "log://local"
# Ou vrai webhook n8n (Cloud / ngrok) :
# npx convex env set N8N_WEBHOOK_URL "https://xxx/webhook/lendloop-borrow-events"
```

> Convex Cloud **ne peut pas** appeler `http://localhost:5678`.  
> Utilise `log://local`, **n8n Cloud**, ou un tunnel (ngrok).

## Sécurité

- HMAC-SHA256 sur `${timestamp}.${body}`
- Headers `X-LendLoop-Timestamp` + `X-LendLoop-Signature`
- Fenêtre 5 minutes
- Idempotence : clé `requestId:status:eventType` / `overdue_reminder:id:YYYY-MM-DD`
- Retries n8n sur le POST ack (`retryOnFail`)
