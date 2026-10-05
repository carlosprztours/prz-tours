/*
 * Validador de contenido.
 *
 * Detecta texto corrupto que se cuela al escribir archivos a mano:
 * caracteres fuera del rango latino, guiones bajos sueltos, palabras pegadas
 * a puntuación y residuos típicos de generación automática.
 *
 *   node scripts/check-content.mjs
 *
 * Dos niveles:
 *
 *   1. DURO — sobre todos los archivos. Busca cosas que nunca son válidas en
 *      este proyecto (CJK, cirílico, árabe, coreano, caracteres de control).
 *   2. BLANDO — solo sobre los literales de prosa (diccionarios de idioma y el
 *      seed). Aquí sí se buscan residuos dentro del texto.
 *
 * Sale con código 1 si encuentra algo, para poder usarse en CI.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { extractStringLiterals, isProse } from "./lib/extract-strings.mjs";

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".sql", ".json"]);
const ROOTS = ["src", "scripts"];

/**
 * Archivos cuyo contenido es texto para el usuario final.
 * Solo en estos se revisan los residuos "blandos"; en el resto del código los
 * guiones bajos y los puntos son sintaxis legítima.
 */
const PROSE_FILES = new Set([
  "src/lib/i18n/dictionaries/es.ts",
  "src/lib/i18n/dictionaries/en.ts",
  "scripts/seed-data.mjs",
]);

/** Cosas que nunca son válidas, en ningún archivo. */
const HARD_CHECKS = [
  {
    name: "CJK / cirílico / árabe / coreano",
    re: /[\u0400-\u04FF\u0590-\u08FF\u0900-\u0DFF\u3000-\u9FFF\uAC00-\uD7AF]+/g,
  },
  {
    name: "caracteres de control",
    re: /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
  },
  {
    name: "sustituto Unicode (caracteres rotos)",
    re: /\uFFFD/g,
  },
];

/**
 * Quita de la prosa lo que los patrones blandos no deben interpretar como
 * "palabra pegada a un punto".
 *
 * Sin esto, una lista de correos o una URL dan falsos positivos: en
 * `a@b.com,c@d.com` el patrón `palabra.compalabra` casa y parece texto
 * corrupto cuando es una configuración válida.
 */
function stripNonProse(value) {
  return value
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, " ") // correos
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"')]+/gi, " ") // URLs
    .replace(/\b[\w-]+\.(?:com|net|org|io|dev|xyz|do|app|co)\b/gi, " ") // dominios sueltos
    .replace(/\b(?:\/[^\s"']+)+\.(?:png|jpe?g|webp|svg|gif|ico|sql|mjs|ts|tsx|js)\b/gi, " "); // rutas
}

/** Residios típicos dentro de la prosa. */
const SOFT_CHECKS = [
  { name: "guiones bajos dobles", re: /_{2,}/g },
  { name: "guion bajo pegado a palabra", re: /[a-záéíóúñ]{2,}_/g },
  { name: "asterisco pegado a palabra", re: /[a-záéíóúñ]{2,}\*/g },
  { name: "palabra pegada a punto o coma", re: /\b[a-záéíóúñ]{4,}[.,][a-záéíóúñ]{3,}\b/g },
  { name: "identificador en medio de frase", re: /\b[a-záéíóúñ]+[a-z][A-Z][a-zA-Z]{2,}\b/g },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (CODE_EXT.has(extname(full))) files.push(full);
  }
  return files;
}

// ───────────────────────────── Ejecución ─────────────────────────────

const problems = [];
let filesChecked = 0;
let stringsChecked = 0;

for (const root of ROOTS) {
  let files;
  try {
    files = walk(root);
  } catch {
    continue;
  }

  for (const file of files) {
    filesChecked++;
    const source = readFileSync(file, "utf8");
    const posix = file.replace(/\\/g, "/");

    // 1) Comprobaciones duras
    for (const { name, re } of HARD_CHECKS) {
      const hits = source.match(re);
      if (hits) {
        problems.push({
          file,
          line: lineOf(source, source.indexOf(hits[0])),
          name,
          sample: hits[0].slice(0, 60),
        });
      }
    }

    // 2) Comprobaciones blandas, solo en prosa
    if (!PROSE_FILES.has(posix)) continue;

    for (const { value, line } of extractStringLiterals(source)) {
      if (!isProse(value)) continue;
      stringsChecked++;

      const clean = stripNonProse(value);
      for (const { name, re } of SOFT_CHECKS) {
        const hit = clean.match(re);
        if (!hit) continue;
        const at = clean.indexOf(hit[0]);
        problems.push({
          file,
          line,
          name,
          sample:
            clean.slice(Math.max(0, at - 30), at + hit[0].length + 30).replace(/\s+/g, " ") +
            `   ⟵ "${hit[0]}"`,
        });
      }
    }
  }
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

// ───────────────────────────── Resultado ─────────────────────────────

if (problems.length === 0) {
  console.log(
    `✓ Contenido limpio — ${filesChecked} archivos, ${stringsChecked} cadenas de texto revisadas.`,
  );
  process.exit(0);
}

console.log(`⚠ ${problems.length} problema(s):\n`);

const seen = new Set();
for (const p of problems) {
  const key = `${p.file}:${p.line}|${p.name}|${p.sample}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  ${p.file}:${p.line}  [${p.name}]`);
  console.log(`    ${p.sample}\n`);
}

process.exit(1);
