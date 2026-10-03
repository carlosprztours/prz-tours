/*
 * Extrae los literales de cadena de un archivo JavaScript/TypeScript.
 *
 * Usa un escáner carácter a carácter en lugar de una expresión regular, porque
 * una regex se desalinea en cuanto el archivo mezcla comillas simples,
 * dobles y backticks (y aquí los tres aparecen).
 *
 * También se salta los comentarios, que no son prosa del usuario.
 */

const QUOTES = new Set(['"', "'", "`"]);

/**
 * @param {string} source  Contenido del archivo.
 * @returns {{ value: string, line: number }[]}
 */
export function extractStringLiterals(source) {
  const out = [];
  let i = 0;
  let line = 1;

  while (i < source.length) {
    const ch = source[i];

    // ── Comentarios ────────────────────────────────────────────────
    if (ch === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }

    // ── Cadena ─────────────────────────────────────────────────────
    if (QUOTES.has(ch)) {
      const quote = ch;
      const startLine = line;
      let value = "";
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") {
          // Decodifica los escapes habituales. Es importante hacerlo bien: si
          // `\n` se leyera como la letra "n", un `\n\n` parecería la palabra
          // "nn" pegada a la siguiente y el validador daría un falso positivo.
          const esc = source[i + 1];
          const decoded = {
            n: "\n",
            t: "\t",
            r: "\r",
            b: "\b",
            f: "\f",
            v: "\v",
            "0": "\0",
          };
          value += esc in decoded ? decoded[esc] : (esc ?? "");
          i += 2;
          continue;
        }
        if (source[i] === "\n") {
          // Cadena sin cerrar: la dejamos fuera para no generar ruido.
          break;
        }
        value += source[i];
        i++;
      }
      i++; // comilla de cierre
      out.push({ value, line: startLine });
      continue;
    }

    if (ch === "\n") line++;
    i++;
  }

  return out;
}

/**
 * Descarta los literales que no son texto para el usuario:
 * rutas, URLs, identificadores, clases CSS, claves de objeto, etc.
 */
export function isProse(value) {
  const v = value.trim();
  if (v.length < 3) return false;
  // Rutas de archivo, URLs, correos
  if (/^(https?:)?\/\//i.test(v)) return false;
  if (/^[\w@/.-]+\.[a-z]{2,5}([/?#]|$)/i.test(v)) return false;
  if (/^\//.test(v)) return false;
  // Claves de objeto o identificadores sin espacios (siteName, durationMinutes)
  if (!/\s/.test(v) && /^[A-Za-z_$][\w$-]*$/.test(v)) return false;
  // Símbolos sueltos
  if (!/[a-zA-Z]{3}/.test(v)) return false;
  return true;
}
