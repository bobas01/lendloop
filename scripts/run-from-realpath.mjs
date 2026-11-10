/**
 * Contourne le junction WAMP :
 * C:\wamp64\www\lendloop → D:\www\lendloop
 *
 * Next.js et Convex cassent si on mélange les deux chemins
 * (ex: C:\wamp64\www\lendloop\D:\www\lendloop\.next\...).
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const realRoot = fs.realpathSync(projectRoot);
process.chdir(realRoot);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/run-from-realpath.mjs <cmd> [args...]");
  process.exit(1);
}

const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  shell: true,
  cwd: realRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
