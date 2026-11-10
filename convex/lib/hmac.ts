/**
 * HMAC-SHA256 pour signer / vérifier les échanges Convex ↔ n8n.
 * Format : signature hex de `${timestamp}.${body}`
 * Headers : X-LendLoop-Timestamp, X-LendLoop-Signature
 */

const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes anti-rejeu

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toHex(sig);
}

export async function signPayload(
  secret: string,
  body: string,
  timestamp = Date.now(),
): Promise<{ timestamp: string; signature: string }> {
  const ts = String(timestamp);
  const signature = await hmacSha256(secret, `${ts}.${body}`);
  return { timestamp: ts, signature };
}

export async function verifySignature(opts: {
  secret: string;
  body: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  now?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { secret, body, timestampHeader, signatureHeader } = opts;
  const now = opts.now ?? Date.now();

  if (!timestampHeader || !signatureHeader) {
    return { ok: false, reason: "Headers HMAC manquants" };
  }

  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "Timestamp invalide" };
  }
  if (Math.abs(now - ts) > MAX_SKEW_MS) {
    return { ok: false, reason: "Timestamp hors fenêtre (rejeu ou horloge)" };
  }

  const expected = await hmacSha256(secret, `${timestampHeader}.${body}`);
  if (expected !== signatureHeader.toLowerCase()) {
    return { ok: false, reason: "Signature invalide" };
  }
  return { ok: true };
}

export function getSharedSecret(): string | undefined {
  return (
    process.env.N8N_SHARED_SECRET ??
    process.env.CONVEX_N8N_SHARED_SECRET ??
    process.env.N8N_WEBHOOK_SECRET
  );
}
