/**
 * Consultas públicas de artículos del blog.
 */
import "server-only";

import { cache } from "react";
import { readEditorialEnglishBatch } from "./editorial-cache";
import { query, queryOne } from "./client";
import type {
  ArticleTranslation,
  ArticleWithContent,
  Locale,
} from "@/types";

async function withContent(
  article: Omit<ArticleWithContent, "translation">,
  locale: Locale,
): Promise<ArticleWithContent | null> {
  const translation = await queryOne<ArticleTranslation>(
    `SELECT id, article_id, locale, title, excerpt, body,
            seo_title, seo_description
     FROM article_translations
     WHERE article_id = ? AND locale = ?`,
    article.id,
    locale,
  );
  if (translation?.title.trim()) return { ...article, translation };
  if (locale !== "en") return null;
  const source = await queryOne<ArticleTranslation>(
    "SELECT * FROM article_translations WHERE article_id = ? AND locale = 'es'", article.id,
  );
  if (!source) return null;
  const values = [source.title, source.excerpt, source.body, source.seo_title ?? "", source.seo_description ?? ""];
  const english = await readEditorialEnglishBatch(values);
  const [title, excerpt, body, seoTitle, seoDescription] = values.map((value) => english(value));
  if (!title || (source.excerpt && !excerpt) || (source.body && !body)) return null;
  return { ...article, translation: {
    ...source, locale, title, excerpt, body,
    seo_title: seoTitle || null, seo_description: seoDescription || null,
  } };
}

export async function listPublishedArticles(
  locale: Locale,
): Promise<ArticleWithContent[]> {
  const rows = await query<Omit<ArticleWithContent, "translation">>(
    `SELECT id, slug, cover_url, is_published, sort_order, created_at, updated_at
     FROM articles
     WHERE is_published = 1
     ORDER BY sort_order ASC, id DESC`,
  );
  const out: ArticleWithContent[] = [];
  for (const row of rows) {
    const full = await withContent(row, locale);
    if (full) out.push(full);
  }
  return out;
}

export const getArticleBySlug = cache(async function getArticleBySlug(
  slug: string,
  locale: Locale,
): Promise<ArticleWithContent | null> {
  const row = await queryOne<Omit<ArticleWithContent, "translation">>(
    `SELECT id, slug, cover_url, is_published, sort_order, created_at, updated_at
     FROM articles WHERE slug = ? AND is_published = 1`,
    slug,
  );
  if (!row) return null;
  return withContent(row, locale);
});

export async function listPublishedArticleSlugs(): Promise<string[]> {
  const rows = await query<{ slug: string }>(
    `SELECT slug FROM articles WHERE is_published = 1 ORDER BY sort_order ASC`,
  );
  return rows.map((r) => r.slug);
}
