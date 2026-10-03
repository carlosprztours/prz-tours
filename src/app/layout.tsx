/**
 * Layout raíz: <html> con idioma, fuentes y estilos globales.
 *
 * El idioma viene de la cabecera `x-locale` que inyecta el proxy (ver
 * src/proxy.ts). Todo el contenido vive bajo `app/[lang]/`.
 */
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { headers } from "next/headers";

import { defaultLocale, isLocale } from "@/lib/i18n/config";
import "./globals.css";

const display = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
