/**
 * GET /sitemap.xml — sitemap dinámico (home, secciones y tours/posts publicados, ES + EN).
 *
 * Route handler (no metadata sitemap) para controlar los headers de la respuesta:
 *  - Evita el `Vary: rsc, next-router-*` que Next añade a las páginas y que
 *    impide que Cloudflare cachee la respuesta en el edge.
 *  - `Cache-Control: public, s-maxage=3600` para que el edge sirva el sitemap
 *    sin depender del Worker en frío (Google Search Console debe leerlo siempre).
 */
import { NextResponse } from "next/server";

import { listPublishedArticleSlugs } from "@/lib/db/articles";
import { listPublishedTourSlugs } from "@/lib/db/tours";
import { locales } from "@/lib/i18n/config";

/** Siempre bajo demanda: el sitemap debe reflejar la BD de producción. */
export const dynamic = "force-dynamic";

/** Dominio canónico (mismo que src/proxy.ts → CANONICAL_HOST). */
const BASE = "https://www.perez-tours.com";

const STATIC_ROUTES = ["", "/tours", "/transfers", "/about", "/contact", "/book", "/blog", "/track"];

const ESCAPE_RE = /[&<>"']/g;

function escapeXml(text: string): string {
  return text.replace(ESCAPE_RE, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

export async function GET() {
  let tourSlugs: string[] = [];
  try {
    tourSlugs = await listPublishedTourSlugs();
  } catch (err) {
    console.error("[sitemap] tour slugs error:", err);
  }
  let articleSlugs: string[] = [];
  try {
    articleSlugs = await listPublishedArticleSlugs();
  } catch (err) {
    console.error("[sitemap] article slugs error:", err);
  }

  const lastmod = new Date().toISOString();
  const entries: string[] = [];
  const append = (loc: string, changefreq: string, priority: string) => {
    entries.push(
      `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    );
  };

  for (const lang of locales) {
    for (const route of STATIC_ROUTES) {
      const url = `${BASE}/${lang}${route}`;
      append(url, route === "" ? "daily" : "weekly", route === "" ? "1" : route === "/tours" ? "0.9" : "0.7");
    }
    for (const slug of tourSlugs) {
      append(`${BASE}/${lang}/tours/${slug}`, "weekly", "0.8");
    }
    for (const slug of articleSlugs) {
      append(`${BASE}/${lang}/blog/${slug}`, "weekly", "0.6");
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries.join("\n")}\n` +
    `</urlset>\n`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}