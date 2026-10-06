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

  // Cabeceras de seguridad para todas las respuestas. No definimos una CSP
  // estricta a propósito: una CSP mal afinada rompe Next y ImageKit. Esto ya
  // frena clickjacking, sniffing de MIME y abuso de permisos del navegador.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Habilita los bindings de Cloudflare (D1, R2) también en `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
