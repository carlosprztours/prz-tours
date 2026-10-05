/**
 * Server Actions de artículos (staff).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireEditor } from "./access";
import { execute, query, queryOne } from "@/lib/db/client";

import type { Article, ArticleTranslation, Locale } from "@/types";

export type ArticlesResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const { locale } = await requireEditor(rawLocale);
  return locale;
}

export type AdminArticleListItem = Pick<
  Article,
  "id" | "slug" | "is_published" | "sort_order"
> & { title_es: string; title_en: string };

export async function listAdminArticles(
  rawLocale: string,
): Promise<AdminArticleListItem[]> {
  await requireStaff(rawLocale);
  return query<AdminArticleListItem>(
    `SELECT a.id, a.slug, a.is_published, a.sort_order,
            MAX(CASE WHEN t.locale = 'es' THEN t.title END) AS title_es,
            MAX(CASE WHEN t.locale = 'en' THEN t.title END) AS title_en
     FROM articles a
     LEFT JOIN article_translations t ON t.article_id = a.id
     GROUP BY a.id
     ORDER BY a.sort_order ASC, a.id DESC`,
  );
}

export type AdminArticleFull = {
  article: Article;
  translations: Record<Locale, ArticleTranslation | null>;
};

export async function getAdminArticle(
  rawLocale: string,
  id: number,
): Promise<AdminArticleFull | null> {
  await requireStaff(rawLocale);
  const article = await queryOne<Article>(`SELECT * FROM articles WHERE id = ?`, id);
  if (!article) return null;
  const translations = await query<ArticleTranslation>(
    `SELECT * FROM article_translations WHERE article_id = ?`,
    id,
  );
  return {
    article,
    translations: {
      es: translations.find((t) => t.locale === "es") ?? null,
      en: translations.find((t) => t.locale === "en") ?? null,
    },
  };
}

function parse(form: FormData) {
  const slug = String(form.get("slug") ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    slug,
    cover_url: String(form.get("cover_url") ?? "").trim() || null,
    sort_order: Math.round(Number(form.get("sort_order")) || 0),
    is_published: form.get("is_published") === "on" ? 1 : 0,
  };
}

async function writeArticle(
  id: number | null,
  base: ReturnType<typeof parse>,
  formData: FormData,
): Promise<number> {
  if (id === null) {
    const result = await execute(
      `INSERT INTO articles (slug, cover_url, is_published, sort_order)
       VALUES (?, ?, ?, ?)`,
      base.slug,
      base.cover_url,
      base.is_published,
      base.sort_order,
    );
    id = Number(result.meta.last_row_id);
  } else {
    await execute(
      `UPDATE articles SET slug = ?, cover_url = ?, is_published = ?,
         sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
      base.slug,
      base.cover_url,
      base.is_published,
      base.sort_order,
      id,
    );
    await execute(`DELETE FROM article_translations WHERE article_id = ?`, id);
  }

  for (const loc of ["es", "en"] as const) {
    const title = String(formData.get(`title_${loc}`) ?? "").trim();
    if (!title) continue;
    await execute(
      `INSERT INTO article_translations
         (article_id, locale, title, excerpt, body, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      loc,
      title,
      String(formData.get(`excerpt_${loc}`) ?? "").trim(),
      String(formData.get(`body_${loc}`) ?? "").trim(),
      String(formData.get(`seo_title_${loc}`) ?? "").trim() || null,
      String(formData.get(`seo_description_${loc}`) ?? "").trim() || null,
    );
  }
  return id;
}

export async function createArticle(
  rawLocale: string,
  _prev: ArticlesResult | undefined,
  formData: FormData,
): Promise<ArticlesResult> {
  const locale = await requireStaff(rawLocale);
  const base = parse(formData);
  if (!base.slug) return { ok: false, error: "bad-slug" };
  const exists = await queryOne<{ id: number }>(
    `SELECT id FROM articles WHERE slug = ?`,
    base.slug,
  );
  if (exists) return { ok: false, error: "slug-taken" };
  await writeArticle(null, base, formData);
  revalidatePath(`/${locale}/blog`);
  redirect(`/${locale}/admin/blog`);
}

export async function updateArticle(
  rawLocale: string,
  id: number,
  _prev: ArticlesResult | undefined,
  formData: FormData,
): Promise<ArticlesResult> {
  const locale = await requireStaff(rawLocale);
  const base = parse(formData);
  if (!base.slug) return { ok: false, error: "bad-slug" };
  const clash = await queryOne<{ id: number }>(
    `SELECT id FROM articles WHERE slug = ? AND id != ?`,
    base.slug,
    id,
  );
  if (clash) return { ok: false, error: "slug-taken" };
  await writeArticle(id, base, formData);
  revalidatePath(`/${locale}/blog`);
  revalidatePath(`/${locale}/admin/blog`);
  return { ok: true };
}

export async function deleteArticle(
  rawLocale: string,
  id: number,
): Promise<ArticlesResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM articles WHERE id = ?`, id);
  revalidatePath(`/${locale}/blog`);
  revalidatePath(`/${locale}/admin/blog`);
  return { ok: true };
}
