import fs from "fs";
import { spawnSync } from "child_process";

const env = fs.readFileSync(".env.local", "utf8");
const line = env
  .split(/\r?\n/)
  .find((l) => l.startsWith("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="));

if (!line) {
  console.error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY manquant dans .env.local");
  process.exit(1);
}

const key = line.slice("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=".length).trim();
const encoded = key.split("_").slice(2).join("_");
const domain = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");

if (!domain || !domain.includes(".")) {
  console.error("Impossible de dériver le domaine Clerk depuis la publishable key");
  process.exit(1);
}

const issuer = domain.startsWith("http") ? domain : `https://${domain}`;
console.log(`CLERK_JWT_ISSUER_DOMAIN=${issuer}`);

const result = spawnSync(
  "npx",
  ["convex", "env", "set", "CLERK_JWT_ISSUER_DOMAIN", issuer],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
