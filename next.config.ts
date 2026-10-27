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

  // Cabeceras de seguridad para todas las respuestas.
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com https://www.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.paypal.com https://www.sandbox.paypal.com https://api.resend.com https://*.imagekit.io https://ik.imagekit.io https://auth.google.com https://oauth2.googleapis.com",
              "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://www.google.com https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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
