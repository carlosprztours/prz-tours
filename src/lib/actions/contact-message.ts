/**
 * Server Action pública: guardar un mensaje de contacto.
 *
 * Valida, guarda en `messages` y avisa al negocio por email.
 * Devuelve `{ ok: true }` o los errores por campo.
 */
"use server";

import { execute } from "@/lib/db/client";
import { contactSchema } from "@/lib/validation/contact";
import {
  definitionRow,
  emailLayout,
  getInternalRecipients,
  sendEmail,
} from "@/lib/notify/email";
import type { Locale } from "@/types";

export type ContactResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export async function sendContactMessage(
  locale: Locale,
  _prevState: ContactResult | undefined,
  formData: FormData,
): Promise<ContactResult> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value.trim() !== "") raw[key] = value;
  }

  // Honeypot anti-spam: los bots rellenan el campo invisible «website»; los
  // humanos no lo ven. Se muestra un error genérico y no se guarda ni envía nada.
  if (typeof formData.get("website") === "string" && (formData.get("website") as string).trim()) {
    return { ok: true };
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const data = parsed.data;

  try {
    await execute(
      `INSERT INTO messages (name, email, phone, subject, body, locale)
       VALUES (?, ?, ?, ?, ?, ?)`,
      data.name,
      data.email,
      data.phone ?? null,
      data.subject ?? null,
      data.message,
      locale,
    );
  } catch (err) {
    console.error("[contact] no se pudo guardar el mensaje:", err);
    return { ok: false, errors: { form: "validation.serverError" } };
  }

  const recipients = await getInternalRecipients();
  if (recipients.length > 0) {
    const rows = [
      definitionRow("Nombre", data.name),
      definitionRow("Email", data.email),
      data.phone ? definitionRow("Teléfono", data.phone) : "",
      data.subject ? definitionRow("Asunto", data.subject) : "",
      `<p style="margin:12px 0 4px;font-size:14px;color:#334155;"><strong>Mensaje:</strong></p><p style="font-size:14px;color:#334155;white-space:pre-line;">${data.message.replace(/</g, "&lt;")}</p>`,
    ].join("");

    // Hay que ESPERAR: si se deja en segundo plano, el Worker puede terminar
    // antes de que salga el aviso (y se pierde el mensaje del cliente).
    try {
      await sendEmail({
        to: recipients,
        subject: `Contacto web: ${data.subject ?? data.name}`,
        html: emailLayout(`Nuevo mensaje de ${data.name}`, rows),
        replyTo: data.email,
        copyToInternal: false,
      });
    } catch (err) {
      console.error("[contact] fallo enviando aviso:", err);
    }
  }

  return { ok: true };
}
