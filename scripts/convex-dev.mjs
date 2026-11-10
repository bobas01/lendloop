/**
 * Contourne un bug Windows : C:\\wamp64\\www\\lendloop est un junction vers
 * D:\\www\\lendloop. Convex/esbuild casse si on lance depuis le junction.
 * On se place donc sur le chemin réel avant d'appeler `convex`.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const realRoot = fs.realpathSync(projectRoot);
process.chdir(realRoot);

const args = process.argv.slice(2);
const result = spawnSync("npx", ["convex", ...args], {
  stdio: "inherit",
  shell: true,
  cwd: realRoot,
});

process.exit(result.status ?? 1);
