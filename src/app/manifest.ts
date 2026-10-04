/**
 * Manifiesto PWA: nombre, iconos, colores y modo standalone.
 *
 * Next sirve esto en /manifest.webmanifest automáticamente.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Perez Tours & Transfers",
    short_name: "Perez Tours",
    description:
      "Tours, excursiones y traslados en Puerto Plata, República Dominicana.",
    id: "/en",
    start_url: "/en",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0e7490",
    lang: "en",
    categories: ["travel"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
