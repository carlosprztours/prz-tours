/*
 * Ejecuta wrangler desde scripts Node de forma portable (Windows/macOS/Linux).
 *
 * Detalles que ya nos mordieron:
 * - En Windows `npx` es un `.cmd` y `execFileSync("npx", …)` falla con
 *   ENOENT si no se usa shell.
 * - Con `shell: true`, cmd.exe fragmenta los argumentos con espacios, así
 *   que `--command "SELECT …"` llega roto a wrangler.
 *
 * Solución: el SQL siempre viaja en un archivo temporal con `--file`.
 * Los argumentos de la línea de comandos quedan cortos y sin espacios.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function runWrangler(db, flag, filePath) {
  try {
    const out = execFileSync(
      NPX,
      ["wrangler", "d1", "execute", db, flag, "--yes", "--file", filePath, "--json"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        // En Windows los .cmd solo se ejecutan a través del shell.
        shell: process.platform === "win32",
      },
    );
    return JSON.parse(out);
  } catch (err) {
    const detail =
      err.stderr?.toString() ?? err.stdout?.toString() ?? err.message;
    console.error(detail);
    process.exit(1);
  }
}

/**
 * Ejecuta SQL contra D1 y devuelve el JSON parseado.
 * Termina el proceso con código 1 si wrangler falla.
 */
export function d1Execute(db, flag, sql) {
  const dir = mkdtempSync(join(tmpdir(), "prz-sql-"));
  try {
    const file = join(dir, "query.sql");
    writeFileSync(file, sql, "utf8");
    return runWrangler(db, flag, file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Alias explícito para sentencias largas (semántica idéntica). */
export function d1ExecuteFile(db, flag, filePath) {
  return runWrangler(db, flag, filePath);
}
