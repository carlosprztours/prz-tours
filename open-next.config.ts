import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Caché incremental desactivada: el contenido vive en D1 y las páginas públicas
// se sirven con `no-store` + revalidación explícita, así que no necesitamos R2
// para la caché de Next.js.
export default defineCloudflareConfig({});
