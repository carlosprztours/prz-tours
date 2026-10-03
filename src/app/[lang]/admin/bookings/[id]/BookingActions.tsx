/**
 * Botones de acción de una reserva (componente de cliente).
 *
 * Llama a las Server Actions de `src/lib/admin/bookings.ts` y muestra el
 * resultado. Solo ofrece las transiciones válidas desde el estado actual.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  setBookingPayment,
  setBookingStatus,
} from "@/lib/admin/bookings";
import { customerStatusMessage, whatsappLink } from "@/lib/notify/whatsapp";
import type { BookingStatus, Locale, PaymentStatus } from "@/types";

type Labels = {
  confirm: string;
  complete: string;
  cancel: string;
  reopen: string;
  markPaid: string;
  markPartial: string;
  markUnpaid: string;
  confirmWhatsapp: string;
  declineWhatsapp: string;
  done: string;
  failed: string;
};

type Props = {
  locale: Locale;
  bookingId: number;
  status: BookingStatus;
  payment: PaymentStatus;
  customer: {
    name: string;
    phone: string;
    reference: string;
    experience: string;
    date: string | null;
    locale: Locale;
  };
  labels: Labels;
};

export function BookingActions({
  locale,
  bookingId,
  status,
  payment,
  customer,
  labels,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? labels.done : labels.failed);
      if (res.ok) router.refresh();
    });
  };

  /**
   * Guarda el estado y abre WhatsApp con el mensaje al cliente.
   * La ventana se abre EN el clic (antes del await) para que los
   * bloqueadores de popups del móvil no la tumben; luego se navega a la
   * URL de WhatsApp. Si el navegador la bloquea igual, el estado ya quedó
   * guardado y se avisa para abrirlo manual.
   */
  const runWithWhatsapp = (to: "confirmed" | "cancelled") => {
    const win = window.open("about:blank", "_blank");
    setMessage(null);
    startTransition(async () => {
      const res = await setBookingStatus(locale, bookingId, to);
      if (!res.ok) {
        win?.close();
        setMessage(labels.failed);
        return;
      }
      setMessage(labels.done);
      router.refresh();
      const url = whatsappLink(
        customer.phone,
        customerStatusMessage(
          {
            name: customer.name,
            reference: customer.reference,
            experience: customer.experience,
            date: customer.date,
          },
          to,
          customer.locale,
        ),
      );
      if (win) {
        win.location.href = url;
      } else {
        window.location.href = url;
      }
    });
  };

  const btn =
    "h-10 rounded-full px-4 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="grid gap-3">
      {status === "pending" && (
        <div className="grid gap-2 border-b border-sand-100 pb-3">
          <button
            disabled={pending || !customer.phone}
            onClick={() => runWithWhatsapp("confirmed")}
            className={`${btn} bg-[#25d366] hover:bg-[#1fb857]`}
          >
            {labels.confirmWhatsapp}
          </button>
          <button
            disabled={pending || !customer.phone}
            onClick={() => runWithWhatsapp("cancelled")}
            className={`${btn} bg-slate-600 hover:bg-slate-700`}
          >
            {labels.declineWhatsapp}
          </button>
          {!customer.phone && (
            <p className="text-xs text-ink-500">
              {locale === "es"
                ? "Sin teléfono: solo cambio de estado."
                : "No phone: status change only."}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <>
            <button disabled={pending} onClick={() => run(() => setBookingStatus(locale, bookingId, "confirmed"))} className={`${btn} bg-ocean-700 hover:bg-ocean-800`}>
              {labels.confirm}
            </button>
            <button disabled={pending} onClick={() => run(() => setBookingStatus(locale, bookingId, "cancelled"))} className={`${btn} bg-red-600 hover:bg-red-700`}>
              {labels.cancel}
            </button>
          </>
        )}
        {status === "confirmed" && (
          <>
            <button disabled={pending} onClick={() => run(() => setBookingStatus(locale, bookingId, "completed"))} className={`${btn} bg-emerald-600 hover:bg-emerald-700`}>
              {labels.complete}
            </button>
            <button disabled={pending} onClick={() => run(() => setBookingStatus(locale, bookingId, "cancelled"))} className={`${btn} bg-red-600 hover:bg-red-700`}>
              {labels.cancel}
            </button>
          </>
        )}
        {(status === "cancelled" || status === "completed") && (
          <button disabled={pending} onClick={() => run(() => setBookingStatus(locale, bookingId, "pending"))} className={`${btn} bg-slate-500 hover:bg-slate-600`}>
            {labels.reopen}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-sand-100 pt-3">
        {payment !== "paid" && (
          <button disabled={pending} onClick={() => run(() => setBookingPayment(locale, bookingId, "paid"))} className={`${btn} bg-emerald-600 hover:bg-emerald-700`}>
            {labels.markPaid}
          </button>
        )}
        {payment !== "partial" && (
          <button disabled={pending} onClick={() => run(() => setBookingPayment(locale, bookingId, "partial"))} className={`${btn} bg-amber-500 hover:bg-amber-600`}>
            {labels.markPartial}
          </button>
        )}
        {payment !== "unpaid" && (
          <button disabled={pending} onClick={() => run(() => setBookingPayment(locale, bookingId, "unpaid"))} className={`${btn} bg-slate-500 hover:bg-slate-600`}>
            {labels.markUnpaid}
          </button>
        )}
      </div>

      {message && (
        <p className="text-sm font-semibold text-ink-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
