/**
 * Suscripciones push: alta, baja y envío.
 *
 * El navegador registra su suscripción en `push_subscriptions` al aceptar el
 * permiso. El envío usa VAPID (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` en
 * secretos). Si las claves no están configuradas, `sendPushToUser` no hace
 * nada y devuelve 0: el sitio sigue funcionando sin push.
 */
import "server-only";

import { execute, query, queryOne } from "./client";

export type PushSubscription = {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

type StoredKeys = { publicKey: string; privateKey: string };

let cachedKeys: StoredKeys | null = null;

/** Claves VAPID del entorno, o `null` si no están configuradas. */
async function vapidKeys(): Promise<StoredKeys | null> {
  if (cachedKeys) return cachedKeys;
  const { getEnvVar } = await import("./client");
  const [publicKey, privateKey] = await Promise.all([
    getEnvVar("VAPID_PUBLIC_KEY"),
    getEnvVar("VAPID_PRIVATE_KEY"),
  ]);
  if (!publicKey || !privateKey) return null;
  cachedKeys = { publicKey, privateKey };
  return cachedKeys;
}

export async function getVapidPublicKey(): Promise<string | null> {
  const keys = await vapidKeys();
  return keys?.publicKey ?? null;
}

export async function saveSubscription(
  userId: number,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | null,
): Promise<void> {
  await execute(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       user_agent = excluded.user_agent,
       last_used_at = datetime('now')`,
    userId,
    sub.endpoint,
    sub.keys.p256dh,
    sub.keys.auth,
    userAgent,
  );
}

export async function deleteSubscription(userId: number, endpoint: string): Promise<void> {
  await execute(
    `DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`,
    userId,
    endpoint,
  );
}

/** ¿Tiene ya alguna suscripción este usuario en este navegador? */
export async function hasSubscription(userId: number): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?`,
    userId,
  );
  return (row?.n ?? 0) > 0;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  lang?: string;
};

/**
 * Envía un push a todos los dispositivos del usuario.
 * Devuelve cuántas notificaciones se entregó (0 si no hay clave o suscripción).
 * Las suscripciones muertas (404/410) se borran solas.
 */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<number> {
  const keys = await vapidKeys();
  if (!keys) return 0;

  const rows = await query<PushSubscription>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`,
    userId,
  );
  if (rows.length === 0) return 0;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:notificaciones@prz-tours.com", keys.publicKey, keys.privateKey);

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    tag: payload.tag ?? "prz",
    lang: payload.lang ?? "es",
  });

  let delivered = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60 * 24 * 7 },
        );
        await execute(
          `UPDATE push_subscriptions SET last_used_at = datetime('now') WHERE id = ?`,
          row.id,
        );
        delivered += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await execute(`DELETE FROM push_subscriptions WHERE id = ?`, row.id);
        }
      }
    }),
  );
  return delivered;
}

// ───────────────────────── Recordatorio de los avisos ─────────────────────────

export type PromptFlags = {
  installSeen: boolean;
  installAccepted: boolean;
  notifySeen: boolean;
  notifyAccepted: boolean;
};

export async function getPromptFlags(userId: number): Promise<PromptFlags> {
  const row = await queryOne<{
    install_seen_at: string | null;
    install_accepted: number;
    notify_seen_at: string | null;
    notify_accepted: number;
  }>(`SELECT * FROM push_prompts WHERE user_id = ?`, userId);

  return {
    installSeen: row?.install_seen_at != null,
    installAccepted: row?.install_accepted === 1,
    notifySeen: row?.notify_seen_at != null,
    notifyAccepted: row?.notify_accepted === 1,
  };
}

/** Marca que ya se mostró el aviso (una vez por usuario). */
export async function markPromptSeen(
  userId: number,
  kind: "install" | "notify",
): Promise<void> {
  const col = kind === "install" ? "install_seen_at" : "notify_seen_at";
  await execute(
    `INSERT INTO push_prompts (user_id, ${col}, updated_at)
     VALUES (?, datetime('now'), datetime('now'))
     ON CONFLICT (user_id) DO UPDATE SET ${col} = datetime('now'), updated_at = datetime('now')`,
    userId,
  );
}

/** Marca que el usuario aceptó (queda instalado / con notificaciones). */
export async function markPromptAccepted(
  userId: number,
  kind: "install" | "notify",
): Promise<void> {
  const col = kind === "install" ? "install_accepted" : "notify_accepted";
  const seen = kind === "install" ? "install_seen_at" : "notify_seen_at";
  await execute(
    `INSERT INTO push_prompts (user_id, ${col}, ${seen}, updated_at)
     VALUES (?, 1, datetime('now'), datetime('now'))
     ON CONFLICT (user_id) DO UPDATE SET ${col} = 1, ${seen} = datetime('now'), updated_at = datetime('now')`,
    userId,
  );
}