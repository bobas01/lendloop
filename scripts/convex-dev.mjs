/**
 * Alias historique → même comportement que `npm run dev:backend`.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const realRoot = fs.realpathSync(projectRoot);
const args = process.argv.slice(2);
const result = spawnSync("npx", ["convex", ...args], {
  stdio: "inherit",
  shell: true,
  cwd: realRoot,
});
process.exit(result.status ?? 1);
