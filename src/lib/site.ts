/**
 * Datos del negocio que se usan como fallback cuando la BD no responde.
 *
 * El valor real vive en la tabla `settings` (editable desde el panel);
 * estas constantes solo se usan si la consulta falla.
 *
 * El número de WhatsApp de trabajo actual es 18098354101. Para cambiarlo de
 * forma permanente, edítalo en el panel (/admin/settings, clave `whatsapp`)
 * o en `scripts/seed-data.mjs` antes de re-sembrar.
 */
export const DEFAULT_WHATSAPP = "18098354101";

export const DEFAULT_PHONE_DISPLAY = "+1 (809) 835-4101";

export const DEFAULT_EMAIL = "carlosdavidpere@gmail.com";
