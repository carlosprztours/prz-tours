/**
 * Textos de la web: cada ficha guarda el par ES/EN de una clave del catálogo.
 * Vacío = la web muestra su texto original.
 */
import { notFound } from "next/navigation";

import { requireSection } from "@/lib/admin/access";
import { saveTextPair } from "@/lib/admin/misc";
import { TEXT_GROUPS, TEXT_HINTS, type TextKeyDef } from "@/lib/admin/site-texts";
import { query } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

function TextRow({ locale, def, es, actual }: { locale: string; def: TextKeyDef; es: boolean; actual: Record<string, string> }) {
  const save = async (formData: FormData): Promise<void> => {
    "use server";
    await saveTextPair(locale, undefined, formData);
  };
  const hint = TEXT_HINTS[def.base]?.[es ? "es" : "en"];
  const field = "min-h-10 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-ocean-500";
  return (
    <form action={save} className="grid gap-2 rounded-2xl border border-sand-200 bg-white p-4">
      <input type="hidden" name="base" value={def.base} />
      <div>
        <p className="font-mono text-sm font-bold text-ink-900">
          {es ? def.labelEs : def.labelEn} <span className="font-normal text-ink-400">· {def.base}</span>
        </p>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          Español
          {def.long ? (
            <textarea name="value_es" rows={3} defaultValue={actual[`${def.base}_es`] ?? ""} className={field} />
          ) : (
            <input name="value_es" defaultValue={actual[`${def.base}_es`] ?? ""} className={field} />
          )}
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          English
          {def.long ? (
            <textarea name="value_en" rows={3} defaultValue={actual[`${def.base}_en`] ?? ""} className={field} />
          ) : (
            <input name="value_en" defaultValue={actual[`${def.base}_en`] ?? ""} className={field} />
          )}
        </label>
      </div>
      {def.image && (
        <p className="text-xs text-ink-500">
          {es
            ? "Pega la URL (súbela antes en Portada o Galería y copia su dirección)."
            : "Paste the URL (upload it first in Hero or Gallery and copy its address)."}
        </p>
      )}
      <button
        type="submit"
        className="h-10 w-fit rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
      >
        {es ? "Guardar" : "Save"}
      </button>
    </form>
  );
}

export default async function AdminTextosPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  await requireSection(locale, "textos");
  const es = locale === "es";

  const rows = await query<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key LIKE '%\\_es' ESCAPE '\\' OR key LIKE '%\\_en' ESCAPE '\\'`,
  );
  const actual: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Textos" : "Site texts"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {es
            ? "Todo lo que dice la web, por idioma. Vacío = texto original."
            : "Everything the site says, per language. Empty = original text."}
        </p>
      </div>
      {TEXT_GROUPS.map((g) => (
        <section key={g.titleEs} className="grid gap-3">
          <h2 className="font-display text-lg font-bold text-ink-900">
            {es ? g.titleEs : g.titleEn}
          </h2>
          {g.keys.map((k) => (
            <TextRow key={k.base} locale={locale} def={k} es={es} actual={actual} />
          ))}
        </section>
      ))}
    </div>
  );
}
