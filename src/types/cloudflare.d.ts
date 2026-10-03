/**
 * Tipos de los bindings de Cloudflare.
 *
 * `CloudflareEnv` es la interfaz global que declara `@opennextjs/cloudflare`.
 * Aquí la ampliamos con nuestros propios bindings (D1 y R2) para que
 * TypeScript los conozca dentro de `getCloudflareContext().env`.
 *
 * Los bindings deben coincidir con `wrangler.jsonc`.
 */

// Tipos del runtime de Workers (D1Database, R2Bucket, D1Result, ...).
/// <reference types="@cloudflare/workers-types" />

import "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    /** Base de datos D1 con todo el contenido y las reservas. */
    DB?: D1Database;
    /** Bucket R2 donde se guardan las imágenes subidas desde el panel. */
    MEDIA?: R2Bucket;
    /** Secreto de firma de sesión (wrangler secret put AUTH_SECRET). */
    AUTH_SECRET?: string;
    /** Clave de la API de Resend para enviar correos. */
    RESEND_API_TOKEN?: string;
    /** Dominio remitente verificado en Resend. */
    RESEND_FROM?: string;
    /** Correo al que se notifican las reservas nuevas. */
    NOTIFY_EMAIL?: string;
  }
}

export {};
