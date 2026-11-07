import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/admin/access";
import { getBookingFinancialSummary } from "@/lib/db/booking-reporting";
import { isLocale } from "@/lib/i18n";

export default async function FinancePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireSection(lang, "finance");
  const es = lang === "es";
  const rows = await getBookingFinancialSummary();
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-2xl font-bold">{es ? "Resumen financiero" : "Financial summary"}</h1>
      <Link href={`/${lang}/admin/bookings`} className="text-ocean-800 underline">{es ? "Ir a reservas" : "Go to bookings"}</Link>
      <p className="max-w-3xl text-sm text-ink-700">{es
        ? "Los cobros provienen de importes registrados por el sistema. Archivar o cancelar no elimina un cobro. D1 no guarda el importe de los reembolsos. El neto calculable omite los expedientes sin importe suficiente y no incluye costes, impuestos ni comisiones."
        : "Collections use amounts recorded by the system. Archiving or cancelling keeps recorded payments. D1 does not store refund amounts. The calculable net omits records with insufficient amounts and excludes costs, taxes and fees."}</p>
      {!rows.length && <p>{es ? "Sin reservas." : "No bookings."}</p>}
      {rows.map((row) => {
        const money = (amount: number) => `${new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${row.currency}`;
        const figures = [
          [es ? "Cobros registrados" : "Recorded collections", money(row.collected)],
          [es ? "Reembolsos registrados (importe sin verificar)" : "Recorded refunds (amount unverified)", row.refunded],
          [es ? "Cobros excluidos de informes" : "Collections excluded from reports", money(row.excluded)],
          [es ? "Valor nominal de reservas excluidas" : "Face value of excluded bookings", money(row.excludedFaceValue)],
          [es ? "Ingresos comerciales netos calculables" : "Calculable net commercial revenue", money(row.knownNet)],
          [es ? "Expedientes incluidos sin importe suficiente para el neto" : "Included records without sufficient amounts for the net", row.includedUnquantified],
          [es ? "Marcadas pagadas o parciales sin importe" : "Marked paid or partial without an amount", row.unquantified],
          [es ? "Reservas pendientes de pago sin cancelar" : "Non-cancelled bookings pending payment", row.pending],
          [es ? "Reservas canceladas" : "Cancelled bookings", row.cancelled],
          [es ? "Reservas archivadas" : "Archived bookings", row.archived],
        ];
        return <section key={row.currency} className="rounded-2xl border border-sand-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-bold">{row.currency}</h2>
          <dl className="grid gap-3 sm:grid-cols-2">{figures.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-sand-50 p-3">
              <dt className="text-sm text-ink-700">{label}</dt>
              <dd className="font-bold">{value}</dd>
            </div>
          ))}</dl>
        </section>;
      })}
    </div>
  );
}
