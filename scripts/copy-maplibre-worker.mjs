// Copies MapLibre's web-worker files from node_modules into public/ so they are served same-origin.
// Run automatically before dev/build (see package.json); the copies are gitignored, so they can never
// drift from the installed maplibre-gl version.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "node_modules/maplibre-gl/dist");
const to = resolve(root, "public/maplibre");

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(resolve(from, file), resolve(to, file));
}
console.log("maplibre worker files copied to public/maplibre");
