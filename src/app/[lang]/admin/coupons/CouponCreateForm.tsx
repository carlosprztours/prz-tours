/**
 * Formulario para crear un cupón manual a un usuario (por email).
 */
"use client";

import { useActionState } from "react";

import {
  createManualCoupon,
  type CouponsResult,
} from "@/lib/admin/coupons";
import type { Locale } from "@/types";

const initialState: CouponsResult = { ok: false, error: "" };

const inputClass =
  "h-10 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
const labelClass = "grid gap-1 text-xs font-bold text-ink-500";

export function CouponCreateForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(
    createManualCoupon.bind(null, locale),
    initialState,
  );
  const es = locale === "es";

  const errorMsg =
    !state.ok && state.error
      ? state.error === "bad-email"
        ? es ? "Escribe un correo válido." : "Enter a valid email."
        : state.error === "no-user"
          ? es ? "No hay cuenta con ese correo." : "No account with that email."
          : state.error === "has-active"
            ? es ? "Esa cuenta ya tiene un cupón activo." : "That account already has an active coupon."
            : es ? "No se pudo crear." : "Could not create."
      : null;

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5"
    >
      <label className={`${labelClass} sm:col-span-2`}>
        {es ? "Email del usuario" : "User email"}
        <input name="email" type="email" required placeholder="cliente@correo.com" className={inputClass} />
      </label>
      <label className={labelClass}>
        {es ? "Descuento % (1–90)" : "Discount % (1–90)"}
        <input name="value" type="number" min={1} max={90} defaultValue={10} className={inputClass} />
      </label>
      <label className={labelClass}>
        {es ? "Vence en (días)" : "Expires in (days)"}
        <input name="days" type="number" min={1} max={365} defaultValue={90} className={inputClass} />
      </label>
      <div className="flex items-end gap-2">
        <label className="flex h-10 items-center gap-2 text-sm font-bold text-ink-900">
          <input type="checkbox" name="send" defaultChecked className="h-4 w-4" />
          {es ? "Enviar correo" : "Send email"}
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800 disabled:opacity-60"
        >
          {pending ? "…" : es ? "Crear" : "Create"}
        </button>
      </div>
      {state.ok && (
        <p className="text-sm font-semibold text-emerald-700 sm:col-span-2 lg:col-span-5" role="status">
          {es ? "Cupón creado." : "Coupon created."}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm font-semibold text-red-700 sm:col-span-2 lg:col-span-5" role="alert">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
