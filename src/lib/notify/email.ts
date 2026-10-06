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
  /** Destinatarios principales (se ven entre sí). */
  to: string | string[];
  /** Copias ocultas: los demás no ven a quién se copió. */
  bcc?: string | string[];
  subject: string;
  /** Versión HTML del correo. */
  html: string;
  /** Versión en texto plano (fallback). */
  text?: string;
  replyTo?: string;
  /**
   * Añade una copia oculta al buzón del dominio y a los correos del personal
   * (`notify_emails`). Por defecto `true`: así queda constancia de TODO lo que
   * sale de la web (reservas, cancelaciones, pagos, cupones).
   *
   * Ponlo en `false` cuando los destinatarios YA son los internos (el aviso al
   * negocio), para no mandarlo dos veces.
   */
  copyToInternal?: boolean;
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

  const to = dedupe(Array.isArray(payload.to) ? payload.to : [payload.to]);
  const bcc = dedupe(Array.isArray(payload.bcc) ? payload.bcc : payload.bcc ? [payload.bcc] : []);

  // Copia de constancia al buzón del dominio y al personal.
  if (payload.copyToInternal !== false) {
    const internal = await getInternalRecipients();
    const yaEnviado = new Set(to.map((a) => a.toLowerCase()));
    for (const dest of internal) {
      if (!yaEnviado.has(dest.toLowerCase())) {
        bcc.push(dest);
        yaEnviado.add(dest.toLowerCase());
      }
    }
  }

  if (to.length === 0) return { sent: false, skipped: "no-recipients" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      ...(bcc.length > 0 ? { bcc } : {}),
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

function dedupe(list: string[]): string[] {
  return [...new Set(list.map((v) => v.trim()).filter(Boolean))];
}

/** Plantilla compartida de correo: cabecera con la marca, cuerpo y pie. */
export function emailLayout(
  title: string,
  bodyHtml: string,
  siteName = "Perez Tours & Transfers",
): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#eef2f7;margin:0;padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;">
    <!-- Marca -->
    <div style="text-align:center;padding:8px 0 20px;">
      <span style="font-size:22px;font-weight:800;color:#0e7490;letter-spacing:.5px;">Perez Tours <span style="color:#f59e0b;">&amp;</span> Transfers</span>
    </div>
    <!-- Tarjeta -->
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08);">
      <div style="background:linear-gradient(135deg,#0e7490,#0891b2);color:#ffffff;padding:28px 28px 24px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:.85;">${escapeHtml(siteName)}</p>
      </div>
      <div style="padding:28px;color:#334155;font-size:15px;line-height:1.6;">${bodyHtml}</div>
    </div>
    <!-- Pie -->
    <p style="text-align:center;margin:20px 8px 0;font-size:12px;color:#94a3b8;line-height:1.6;">
      Puerto Plata, República Dominicana &nbsp;·&nbsp; ${escapeHtml(DEFAULT_PHONE_DISPLAY)}<br>
      Si no esperabas este correo, escríbenos y lo revisamos.
    </p>
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
