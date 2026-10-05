/**
 * Página de cupones del panel: crear manuales, reenviar y cancelar.
 */
import { notFound } from "next/navigation";

import {
  cancelCoupon,
  listAdminCoupons,
  resendCouponEmail,
} from "@/lib/admin/coupons";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { CouponCreateForm } from "./CouponCreateForm";

async function SendButton({ locale, id }: { locale: Locale; id: number }) {
  async function send() {
    "use server";
    await resendCouponEmail(locale, id);
  }
  return (
    <form action={send}>
      <button
        type="submit"
        className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-bold text-ocean-700 transition hover:border-ocean-300"
      >
        {locale === "es" ? "Enviar correo" : "Send email"}
      </button>
    </form>
  );
}

async function CancelButton({ locale, id }: { locale: Locale; id: number }) {
  async function cancel() {
    "use server";
    await cancelCoupon(locale, id);
  }
  return (
    <form action={cancel}>
      <button
        type="submit"
        className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
      >
        {locale === "es" ? "Cancelar" : "Cancel"}
      </button>
    </form>
  );
}

export default async function AdminCouponsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  const items = await listAdminCoupons(locale);

  const reasonLabel = (r: string) =>
    r === "invite"
      ? es ? "Invitado" : "Invite"
      : r === "loyalty"
        ? es ? "Recurrente" : "Loyalty"
        : es ? "Manual" : "Manual";

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">
        {es ? "Cupones" : "Coupons"} · {items.length}
      </h1>

      <CouponCreateForm locale={locale} />

      <ul className="grid gap-3">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-4"
          >
            <div>
              <p className="font-mono font-display text-lg font-extrabold tracking-wide text-ink-900">
                {c.code}
                <span className="ml-2 rounded-full bg-sand-100 px-2 py-0.5 font-sans text-xs font-bold text-ink-600">
                  {c.status}
                </span>
              </p>
              <p className="text-xs text-ink-500">
                {c.owner_name} · {c.owner_email} · −{c.value}
                {c.kind === "percent" ? "%" : "$"} · {reasonLabel(c.reason)}
                {c.expires_at ? ` · vence ${c.expires_at.slice(0, 10)}` : ""}
              </p>
            </div>
            {c.status === "active" && (
              <span className="flex gap-2">
                <SendButton locale={locale} id={c.id} />
                <CancelButton locale={locale} id={c.id} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
