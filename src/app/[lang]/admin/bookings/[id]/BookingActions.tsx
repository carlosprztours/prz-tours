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
import type { BookingStatus, PaymentStatus } from "@/types";

type Labels = {
  confirm: string;
  complete: string;
  cancel: string;
  reopen: string;
  markPaid: string;
  markPartial: string;
  markUnpaid: string;
  done: string;
  failed: string;
};

type Props = {
  locale: string;
  bookingId: number;
  status: BookingStatus;
  payment: PaymentStatus;
  labels: Labels;
};

export function BookingActions({ locale, bookingId, status, payment, labels }: Props) {
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

  const btn =
    "h-10 rounded-full px-4 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-60";

  return (
    <div className="grid gap-3">
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
