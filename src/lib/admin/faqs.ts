/**
 * Server Actions de preguntas frecuentes (staff).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { execute, query, queryOne } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type { Faq, Locale } from "@/types";

export type FaqsResult = { ok: true } | { ok: false; error: string };

async function requireStaff(rawLocale: string): Promise<Locale> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  await verifySession(locale);
  return locale;
}

export async function listAdminFaqs(rawLocale: string): Promise<Faq[]> {
  await requireStaff(rawLocale);
  return query<Faq>(`SELECT * FROM faqs ORDER BY sort_order ASC, id ASC`);
}

export async function getAdminFaq(
  rawLocale: string,
  id: number,
): Promise<Faq | null> {
  await requireStaff(rawLocale);
  return queryOne<Faq>(`SELECT * FROM faqs WHERE id = ?`, id);
}

function parse(form: FormData) {
  return {
    question_es: String(form.get("question_es") ?? "").trim(),
    answer_es: String(form.get("answer_es") ?? "").trim(),
    question_en: String(form.get("question_en") ?? "").trim(),
    answer_en: String(form.get("answer_en") ?? "").trim(),
    sort_order: Math.round(Number(form.get("sort_order")) || 0),
    is_published: form.get("is_published") === "on" ? 1 : 0,
  };
}

export async function createFaq(
  rawLocale: string,
  _prev: FaqsResult | undefined,
  formData: FormData,
): Promise<FaqsResult> {
  const locale = await requireStaff(rawLocale);
  const f = parse(formData);
  if (!f.question_es || !f.answer_es) return { ok: false, error: "required" };
  await execute(
    `INSERT INTO faqs (question_es, answer_es, question_en, answer_en, sort_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    f.question_es,
    f.answer_es,
    f.question_en,
    f.answer_en,
    f.sort_order,
    f.is_published,
  );
  revalidatePath(`/${locale}/contact`);
  redirect(`/${locale}/admin/faq`);
}

export async function updateFaq(
  rawLocale: string,
  id: number,
  _prev: FaqsResult | undefined,
  formData: FormData,
): Promise<FaqsResult> {
  const locale = await requireStaff(rawLocale);
  const f = parse(formData);
  if (!f.question_es || !f.answer_es) return { ok: false, error: "required" };
  await execute(
    `UPDATE faqs SET question_es = ?, answer_es = ?, question_en = ?,
       answer_en = ?, sort_order = ?, is_published = ? WHERE id = ?`,
    f.question_es,
    f.answer_es,
    f.question_en,
    f.answer_en,
    f.sort_order,
    f.is_published,
    id,
  );
  revalidatePath(`/${locale}/contact`);
  revalidatePath(`/${locale}/admin/faq`);
  return { ok: true };
}

export async function deleteFaq(
  rawLocale: string,
  id: number,
): Promise<FaqsResult> {
  const locale = await requireStaff(rawLocale);
  await execute(`DELETE FROM faqs WHERE id = ?`, id);
  revalidatePath(`/${locale}/contact`);
  revalidatePath(`/${locale}/admin/faq`);
  return { ok: true };
}
