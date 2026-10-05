/**
 * Cliente de D1.
 *
 * Un único punto de acceso a la base de datos. Todas las consultas de la
 * aplicación pasan por aquí (ver los módulos hermanos: tours.ts, bookings.ts, etc.).
 *
 * Funciona igual en local (`next dev`, vía initOpenNextCloudflareForDev) y en
 * producción (Workers), porque en ambos casos OpenNext expone los bindings del
 * wrangler.jsonc.
 */
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Lanza un error claro si el binding D1 no está disponible. */
async function requireDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });

  const db = env.DB;
  if (!db) {
    throw new Error(
      "Binding D1 'DB' no disponible. Revisa wrangler.jsonc y que las migraciones " +
        "se hayan aplicado con `npm run db:migrate:local`.",
    );
  }
  return db;
}

/** Devuelve la instancia de D1 para la petición actual. */
export async function getDb(): Promise<D1Database> {
  return requireDb();
}

/** Devuelve el bucket de R2 (o `null` si no está configurado). */
export async function getMediaBucket(): Promise<R2Bucket | null> {
  const { env } = await getCloudflareContext({ async: true });
  return env.MEDIA ?? null;
}

/** Variables de entorno de tipo texto (secretos incluidos). */
export type StringEnvKey =
  | "AUTH_SECRET"
  | "RESEND_API_TOKEN"
  | "RESEND_FROM"
  | "NOTIFY_EMAIL"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "NEXTJS_ENV";

/** Lee una variable de entorno de Cloudflare (secretos incluidos). */
export async function getEnvVar(key: StringEnvKey): Promise<string | undefined> {
  const { env } = await getCloudflareContext({ async: true });
  // `CloudflareEnv` solo declara parte de las claves (se genera con
  // `wrangler types`); el acceso dinámico va por Record.
  const vars = env as unknown as Record<string, string | undefined>;
  return vars[key];
}

// ───────────────────────────── Helpers de consulta ─────────────────────────────

/** Fila genérica devuelta por D1. */
type Row = Record<string, unknown>;

/** Ejecuta una consulta que devuelve muchas filas. */
export async function query<T = Row>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const result = await bound.all<T>();
  return result.results ?? [];
}

/** Ejecuta una consulta que devuelve como mucho una fila. */
export async function queryOne<T = Row>(
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, ...params);
  return rows[0] ?? null;
}

/** Ejecuta una escritura (INSERT / UPDATE / DELETE) y devuelve `meta`. */
export async function execute(
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  return bound.run();
}

/**
 * Ejecuta varias escrituras en una sola transacción.
 * Si alguna sentencia falla, no se aplica ninguna.
 */
export async function batch(statements: { sql: string; params?: unknown[] }[]) {
  const db = await getDb();
  const prepared = statements.map(({ sql, params }) => {
    const stmt = db.prepare(sql);
    return params?.length ? stmt.bind(...params) : stmt;
  });
  return db.batch(prepared);
}
