/**
 * Registro de actividad del staff (solo lectura).
 */
import { notFound } from "next/navigation";

import { listActivity } from "@/lib/admin/activity";
import { verifySession } from "@/lib/auth/dal";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  const session = await verifySession(locale);
  if (session.user.role !== "admin") notFound();

  const entries = await listActivity(100);

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">
        {es ? "Actividad" : "Activity"}
      </h1>

      <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">{es ? "Fecha" : "Date"}</th>
              <th className="px-4 py-3">{es ? "Quién" : "Who"}</th>
              <th className="px-4 py-3">{es ? "Acción" : "Action"}</th>
              <th className="px-4 py-3">{es ? "Detalle" : "Detail"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-sand-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-500">
                  {e.created_at.slice(0, 16)}
                </td>
                <td className="px-4 py-2.5 font-semibold text-ink-900">
                  {e.actor_email ?? e.actor ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <code className="rounded bg-sand-100 px-2 py-0.5 font-mono text-xs">
                    {e.action}
                  </code>
                </td>
                <td className="px-4 py-2.5 text-ink-700">{e.detail ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-500">
                  {es ? "Sin actividad todavía." : "No activity yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
