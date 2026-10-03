/**
 * Sitemap dinámico: home, secciones y todos los tours publicados (ES + EN).
 */
import type { MetadataRoute } from "next";

import { listPublishedTourSlugs } from "@/lib/db/tours";
import { locales } from "@/lib/i18n/config";

const BASE = "https://pereztours.cloud";
const STATIC_ROUTES = ["", "/tours", "/transfers", "/about", "/contact", "/book"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await listPublishedTourSlugs().catch(() => [] as string[]);

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
  }
  return entries;
}
