/**
 * Descarga los assets de Lovable a public/ conservando su ruta original.
 *
 * Los archivos src/assets/*.asset.json apuntan a /__l5e/assets-v1/<id>/<archivo>,
 * una ruta que solo existe dentro del preview de Lovable (el dev server la
 * proxea y únicamente si LOVABLE_PREVIEW_HOST está definido). Fuera de ahí
 * —por ejemplo en Vercel— esas imágenes dan 404.
 *
 * Guardando cada archivo en public/__l5e/assets-v1/<id>/<archivo> la misma URL
 * pasa a resolverse como archivo estático, sin cambiar una sola línea de los
 * componentes y sin romper el proyecto del lado de Lovable.
 *
 *   node scripts/fetch-assets.mjs          # baja solo los que faltan
 *   node scripts/fetch-assets.mjs --force  # vuelve a bajar todo
 */

import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "src", "assets");
const publicDir = join(root, "public");
const force = process.argv.includes("--force");

const projectJson = JSON.parse(await readFile(join(root, ".lovable", "project.json"), "utf8"));

async function readProjectId() {
  const entries = await readdir(assetsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".asset.json")) continue;
    const asset = JSON.parse(await readFile(join(assetsDir, entry), "utf8"));
    if (asset.project_id) return asset.project_id;
  }
  return projectJson.project_id;
}

const projectId = process.env.LOVABLE_PROJECT_ID ?? (await readProjectId());
const host = process.env.LOVABLE_PREVIEW_HOST ?? `id-preview--${projectId}.lovable.app`;

if (!projectId) {
  console.error("No pude determinar el project id. Definí LOVABLE_PROJECT_ID.");
  process.exit(1);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const entries = (await readdir(assetsDir)).filter((f) => f.endsWith(".asset.json"));
let downloaded = 0;
let skipped = 0;
const failures = [];

for (const entry of entries) {
  const asset = JSON.parse(await readFile(join(assetsDir, entry), "utf8"));
  if (!asset.url?.startsWith("/")) continue;

  const target = join(publicDir, ...asset.url.replace(/^\//, "").split("/"));

  if (!force && (await exists(target))) {
    skipped += 1;
    continue;
  }

  const url = `https://${host}${asset.url}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer);
    downloaded += 1;
    console.log(`  ✓ ${asset.original_filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    failures.push(`${asset.original_filename}: ${error.message}`);
    console.error(`  ✗ ${asset.original_filename} — ${error.message}`);
  }
}

console.log(`\n${downloaded} descargados, ${skipped} ya existían, ${failures.length} fallaron.`);
if (failures.length) process.exit(1);
