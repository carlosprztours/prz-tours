/*
 * Aplica un archivo SQL a D1 (solo escritura).
 *
 *   node scripts/apply-sql.mjs archivo.sql            (local)
 *   node scripts/apply-sql.mjs --remote archivo.sql   (remoto, vía with-secrets)
 *
 * Para lecturas que devuelvan filas usa `wrangler d1 execute --command`
 * directo: `--file` remoto solo devuelve resúmenes, no filas.
 */
import { readFileSync } from "node:fs";
import { d1ExecuteFile } from "./lib/run-wrangler.mjs";

const mode = process.argv[2] === "--remote" ? "--remote" : "--local";
const file = mode === "--remote" ? process.argv[3] : process.argv[2];
if (!file) {
  console.error("Uso: node scripts/apply-sql.mjs [--remote] archivo.sql");
  process.exit(1);
}
const sql = readFileSync(file, "utf8");
if (!sql.trim()) {
  console.error("✗ Archivo vacío o ilegible.");
  process.exit(1);
}
d1ExecuteFile("prz-tours", mode, file);
console.log(`✓ Aplicado (${mode}): ${file}`);
