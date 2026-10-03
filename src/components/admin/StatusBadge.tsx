/**
 * Badge de estado de reserva + etiqueta traducida.
 *
 * Compartido entre la lista y el detalle del panel.
 */
import { adminTexts } from "@/lib/admin/texts";
import type { BookingStatus, Locale, PaymentStatus } from "@/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-ocean-100 text-ocean-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-slate-100 text-slate-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-red-100 text-red-700",
};

export function statusLabel(status: BookingStatus, locale: Locale): string {
  const t = adminTexts(locale);
  if (status === "pending") return t.statusPending;
  if (status === "confirmed") return t.statusConfirmed;
  if (status === "completed") return t.statusCompleted;
  return t.statusCancelled;
}

export function paymentLabel(payment: PaymentStatus, locale: Locale): string {
  const t = adminTexts(locale);
  if (payment === "unpaid") return t.payUnpaid;
  if (payment === "partial") return t.payPartial;
  if (payment === "paid") return t.payPaid;
  return t.payRefunded;
}

export function StatusBadge({ status, locale }: { status: BookingStatus; locale: Locale }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
      {statusLabel(status, locale)}
    </span>
  );
}

export function PaymentBadge({ payment, locale }: { payment: PaymentStatus; locale: Locale }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${PAYMENT_STYLES[payment]}`}>
      {paymentLabel(payment, locale)}
    </span>
  );
}
