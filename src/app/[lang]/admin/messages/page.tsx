/**
 * Bandeja de mensajes de contacto: lista + detalle con marcar leído/eliminar.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteMessage, listMessages, markMessageRead } from "@/lib/admin/misc";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

export default async function AdminMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ id?: string; solo?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";
  const sp = await searchParams;

  const onlyUnread = sp.solo === "noleidos";
  const messages = await listMessages(locale, onlyUnread);
  const selected = sp.id
    ? messages.find((m) => m.id === Number(sp.id))
    : messages[0];

  const link = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    if (onlyUnread) p.set("solo", "noleidos");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return `/${locale}/admin/messages${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Mensajes" : "Messages"} · {messages.length}
        </h1>
        <Link
          href={onlyUnread ? link({ solo: "" }) : link({ solo: "noleidos" })}
          className="rounded-full border border-sand-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 hover:ring-1 hover:ring-ocean-300"
        >
          {onlyUnread
            ? es
              ? "Ver todos"
              : "View all"
            : es
              ? "Solo no leídos"
              : "Unread only"}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ul className="grid min-w-0 grid-cols-1 content-start gap-2">
          {messages.map((m) => (
            <li key={m.id}>
              <Link
                href={link({ id: String(m.id) })}
                className={`block rounded-2xl border p-4 transition ${
                  selected?.id === m.id
                    ? "border-ocean-500 bg-white shadow"
                    : "border-sand-200 bg-white hover:ring-1 hover:ring-ocean-300"
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  {!m.is_read && <span className="h-2 w-2 rounded-full bg-coral-500" aria-label={es ? "No leído" : "Unread"} />}
                  {m.name}
                </p>
                <p className="truncate text-xs text-ink-500">{m.subject || m.body.slice(0, 60)}</p>
                <p className="mt-1 text-xs text-ink-500">{m.created_at.slice(0, 16)}</p>
              </Link>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="rounded-2xl border border-sand-200 bg-white p-8 text-center text-sm text-ink-500">
              {es ? "Sin mensajes." : "No messages."}
            </li>
          )}
        </ul>

        <div className="h-fit min-w-0 rounded-2xl border border-sand-200 bg-white p-6 lg:sticky lg:top-24">
          {!selected ? (
            <p className="text-sm text-ink-500">{es ? "Elige un mensaje." : "Pick a message."}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold text-ink-900">
                  {selected.subject || (es ? "Sin asunto" : "No subject")}
                </h2>
                <span className="flex gap-2">
                  <form
                    action={async (): Promise<void> => {
                      "use server";
                      await markMessageRead(locale, selected.id, selected.is_read !== 1);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full bg-ocean-100 px-3 py-1.5 text-xs font-bold text-ocean-800 hover:bg-ocean-200"
                    >
                      {selected.is_read === 1
                        ? es
                          ? "Marcar no leído"
                          : "Mark unread"
                        : es
                          ? "Marcar leído"
                          : "Mark read"}
                    </button>
                  </form>
                  <DeleteButton
                    locale={locale}
                    id={selected.id}
                    action={deleteMessage}
                    confirmMessage={es ? "¿Eliminar este mensaje?" : "Delete this message?"}
                    label={es ? "Eliminar" : "Delete"}
                  />
                </span>
              </div>
              <p className="mt-2 text-sm break-words text-ink-500">
                {selected.name} ·{" "}
                <a href={`mailto:${selected.email}`} className="font-bold break-all text-ocean-700 hover:underline">
                  {selected.email}
                </a>
                {selected.phone ? ` · ${selected.phone}` : ""} · {selected.created_at.slice(0, 16)}
              </p>
              <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-ink-700">
                {selected.body}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
