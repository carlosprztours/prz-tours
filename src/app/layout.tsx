/**
 * Layout raíz: <html> con idioma, fuentes y estilos globales.
 *
 * El idioma viene de la cabecera `x-locale` que inyecta el proxy (ver
 * src/proxy.ts). Todo el contenido vive bajo `app/[lang]/`.
 */
import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";

import { defaultLocale, isLocale } from "@/lib/i18n/config";
import "./globals.css";

/*
 * Fuentes auto-hospedadas (src/app/fonts/*.woff2, subsets latin).
 * Se usa next/font/local en vez de next/font/google para que el build no
 * dependa de descargarlas de Google en cada CI (esa descarga fallaba de
 * forma intermitente y rompía el deploy).
 */
const display = localFont({
  variable: "--font-display",
  src: [
    { path: "./fonts/poppins-500.woff2", weight: "500" },
    { path: "./fonts/poppins-600.woff2", weight: "600" },
    { path: "./fonts/poppins-700.woff2", weight: "700" },
    { path: "./fonts/poppins-800.woff2", weight: "800" },
  ],
  display: "swap",
});

const sans = localFont({
  variable: "--font-sans",
  src: [{ path: "./fonts/inter-var.woff2", weight: "400 700" }],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pereztours.cloud"),
  title: {
    default: "Perez Tours & Transfers · Puerto Plata",
    template: "%s · Perez Tours",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const raw = headerList.get("x-locale") ?? defaultLocale;
  const lang = isLocale(raw) ? raw : defaultLocale;

  return (
    <html lang={lang} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-full flex-col bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
