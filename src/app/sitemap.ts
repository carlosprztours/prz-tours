/**
 * Sitemap dinámico: home, secciones y todos los tours publicados (ES + EN).
 */
import type { MetadataRoute } from "next";

import { listPublishedArticleSlugs } from "@/lib/db/articles";
import { listPublishedTourSlugs } from "@/lib/db/tours";
import { locales } from "@/lib/i18n/config";

/** Siempre bajo demanda: el sitemap debe reflejar la BD de producción. */
export const dynamic = "force-dynamic";

/** Dominio canónico (mismo que src/proxy.ts → CANONICAL_HOST). */
const BASE = "https://www.perez-tours.com";
const STATIC_ROUTES = ["", "/tours", "/transfers", "/about", "/contact", "/book", "/blog", "/track"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  try {
    slugs = await listPublishedTourSlugs();
  } catch (err) {
    console.error("[sitemap] slugs error:", err);
  }
  let articleSlugs: string[] = [];
  try {
    articleSlugs = await listPublishedArticleSlugs();
  } catch (err) {
    console.error("[sitemap] article slugs error:", err);
  }

  const entries: MetadataRoute.Sitemap = [];
  for (const lang of locales) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${BASE}/${lang}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : route === "/tours" ? 0.9 : 0.7,
      });
    }
    for (const slug of slugs) {
      entries.push({
        url: `${BASE}/${lang}/tours/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const slug of articleSlugs) {
      entries.push({
        url: `${BASE}/${lang}/blog/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }
  return entries;
}
