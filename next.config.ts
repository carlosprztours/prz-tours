import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rutas con prefijo de idioma (/es, /en). El proxy.ts se encarga de redirigir
  // las peticiones sin locale hacia /es.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Envío de formularios vía Server Actions (no_route_segment config needed)
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  poweredByHeader: false,
};

export default nextConfig;

// Habilita los bindings de Cloudflare (D1, R2) también en `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
