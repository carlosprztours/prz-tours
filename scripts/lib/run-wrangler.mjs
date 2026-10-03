/*
 * Ejecuta wrangler desde scripts Node de forma portable (Windows/macOS/Linux).
 *
 * Detalles que ya nos mordieron:
 * - En Windows `npx` es un `.cmd` y `execFileSync("npx", …)` falla con
 *   ENOENT si no se usa shell.
 * - Con `shell: true`, Node concatena sin entrecomillar: los valores con
 *   espacios se envuelven en comillas dobles a mano (nuestro SQL solo usa
 *   comillas simples, así que es seguro).
 * - En remoto, `--file` devuelve un resumen de importación, nunca filas:
 *   las lecturas van por `--command`; `--file` solo para escrituras largas
 *   (límite de ~8 KB de la línea de comandos en Windows).
 */
import { execFileSync } from "node:child_process";

const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function runWrangler(db, flag, sqlArgs) {
  const useShell = process.platform === "win32";
  // Con shell:true Node concatena sin entrecomillar: hay que envolver los
  // valores con espacios. Nuestro SQL solo usa comillas simples, así que
  // envolver en dobles es seguro.
  const finalArgs = useShell
    ? sqlArgs.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : sqlArgs;
  try {
    const out = execFileSync(
      NPX,
      ["wrangler", "d1", "execute", db, flag, "--yes", ...finalArgs, "--json"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        // En Windows los .cmd solo se ejecutan a través del shell.
        shell: useShell,
      },
    );
    // En remoto wrangler a veces imprime líneas de estado antes del JSON.
    // Se extrae el bloque JSON (empieza en `[` y termina en `]`).
    const start = out.indexOf("[");
    const end = out.lastIndexOf("]");
    if (start < 0 || end < 0) {
      console.error(out);
      process.exit(1);
    }
    return JSON.parse(out.slice(start, end + 1));
  } catch (err) {
    const detail =
      err.stderr?.toString() ?? err.stdout?.toString() ?? err.message;
    console.error(detail);
    process.exit(1);
  }
}

/**
 * Sentencias CORTAS (lecturas y escrituras simples): viajan por `--command`
 * para que los SELECT devuelvan filas reales. En remoto, `--file` devuelve
 * solo un resumen de importación, lo que rompe cualquier lectura.
 */
export function d1Execute(db, flag, sql) {
  return runWrangler(db, flag, ["--command", sql]);
}

/**
 * Sentencias LARGAS (solo escritura, p. ej. lotes del seed): viajan por
 * `--file` porque la línea de comandos de Windows tiene límite de ~8 KB.
 * NO usar para lecturas en remoto (devuelve resumen, no filas).
 */
export function d1ExecuteFile(db, flag, filePath) {
  return runWrangler(db, flag, ["--file", filePath]);
}
