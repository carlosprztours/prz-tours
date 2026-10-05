/**
 * Envío de correos vía Resend.
 *
 * Si no hay `RESEND_API_TOKEN` configurado, `sendEmail` no falla: registra el
 * aviso y devuelve `{ sent: false }`. Así el sitio funciona en local sin
 * claves y las reservas nunca se pierden por un fallo del proveedor.
 *
 * Para producción: verifica tu dominio en resend.com, crea la API key y
 * define los secretos con `wrangler secret put`.
 */
import "server-only";

import { getEnvVar } from "@/lib/db/client";
import { getSetting } from "@/lib/db/content";
import { DEFAULT_PHONE_DISPLAY } from "@/lib/site";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  /** Versión HTML del correo. */
  html: string;
  /** Versión en texto plano (fallback). */
  text?: string;
  replyTo?: string;
};

export type SendResult = { sent: boolean; id?: string; skipped?: string };

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const [apiKey, from, notifyEmail] = await Promise.all([
    getEnvVar("RESEND_API_TOKEN"),
    getEnvVar("RESEND_FROM"),
    getEnvVar("NOTIFY_EMAIL"),
  ]);

  if (!apiKey || !from) {
    console.warn(
      "[email] RESEND_API_TOKEN o RESEND_FROM sin configurar; correo no enviado.",
      { to: payload.to, subject: payload.subject },
    );
    return { sent: false, skipped: "missing-config" };
  }

  const to = Array.isArray(payload.to) ? payload.to : [payload.to];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: payload.replyTo ?? notifyEmail ?? undefined,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[email] Resend respondió con error:", res.status, detail);
    return { sent: false, skipped: `resend-${res.status}` };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, id: data.id };
}

/** Plantilla mínima compartida (encabezado + pie con la marca). */
export function emailLayout(
  title: string,
  bodyHtml: string,
  siteName = "Perez Tours & Transfers",
): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#0e7490;color:#ffffff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">${escapeHtml(title)}</h1>
      <p style="margin:4px 0 0;font-size:14px;opacity:.9;">${escapeHtml(siteName)}</p>
    </div>
    <div style="padding:24px;">${bodyHtml}</div>
    <div style="padding:16px 24px;background:#f4f6f8;font-size:12px;color:#64748b;">
      Puerto Plata, República Dominicana · ${escapeHtml(DEFAULT_PHONE_DISPLAY)}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Destinatarios internos del aviso (reservas nuevas, pagos, contacto).
 *
 * Se leen del ajuste `notify_emails` (lista separada por comas) y, si no
 * existe, del ajuste `email` de siempre. Así el aviso llega a más de una
 * persona sin tocar código ni desplegar: se edita en `/admin/settings`.
 *
 * Filtra entradas vacías y direcciones que no parezcan un correo, para que un
 * valor mal escrito en el panel no rompa el envío entero.
 */
export async function getInternalRecipients(): Promise<string[]> {
  const [list, legacy] = await Promise.all([
    getSetting("notify_emails", ""),
    getSetting("email", ""),
  ]);

  const raw = list.trim() || legacy.trim();
  if (!raw) return [];

  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((v) => v.trim())
        .filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)),
    ),
  ];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Filas clave/valor para el resumen de la reserva. */
export function definitionRow(label: string, value: string): string {
  return `<p style="margin:6px 0;font-size:14px;color:#334155;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}
