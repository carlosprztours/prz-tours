/**
 * Hash de contraseñas con PBKDF2-SHA256.
 *
 * Usa WebCrypto (`crypto.subtle`), disponible tanto en Node.js como en el
 * runtime de Cloudflare Workers, así que el mismo código corre en local y en
 * producción sin dependencias nativas (bcrypt no funciona en Workers).
 *
 * Formato almacenado: `pbkdf2-sha256$<iteraciones>$<sal_b64>$<hash_b64>`
 */
import "server-only";

const ALGORITHM = "pbkdf2-sha256";
/** Iteraciones según recomendación OWASP para PBKDF2-HMAC-SHA256. */
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Codifica a UTF-8 devolviendo `Uint8Array<ArrayBuffer>`.
 * `TextEncoder.encode()` devuelve `Uint8Array<ArrayBufferLike>` según los
 * tipos de Node, que `crypto.subtle` no acepta en TS estricto.
 */
function encodeUtf8(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(text));
}

/** Compara dos hashes en tiempo constante para evitar ataques de timing. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Genera el hash de una contraseña en texto plano. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_BYTES * 8,
  );
  return `${ALGORITHM}$${ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

/** Verifica una contraseña contra su hash. Devuelve `false` si el formato es inválido. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== ALGORITHM) return false;

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 10_000) return false;

  let salt: Uint8Array<ArrayBuffer>;
  let expected: Uint8Array;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    expected.length * 8,
  );
  return timingSafeEqual(new Uint8Array(bits), expected);
}
