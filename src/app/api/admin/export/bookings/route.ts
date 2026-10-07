/**
 * GET /api/admin/export/bookings — descarga CSV de reservas (staff).
 *
 * Acepta los mismos filtros que la lista (?estado=&q=&desde=&hasta=).
 * Excel lo abre directo; separado por comas con cabecera.
 */
import { requireStaffRoles } from "@/lib/admin/access";
import { listBookings } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { BookingStatus } from "@/types";

function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const lang = parts[1] ?? "en";
  const locale = isLocale(lang) ? lang : "en";

  try {
    await requireStaffRoles(locale, "admin", "editor");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = url.searchParams;
  const estado = sp.get("estado") ?? "all";
  const status: BookingStatus | "all" = [
    "pending",
    "confirmed",
    "completed",
    "cancelled",
  ].includes(estado)
    ? (estado as BookingStatus)
    : "all";
  const bookings = await listBookings({
    status,
    search: sp.get("q")?.trim() || undefined,
    from: sp.get("desde") || undefined,
    to: sp.get("hasta") || undefined,
    limit: 2000,
  });

  const header = [
    "reference", "kind", "tour", "transfer", "name", "email", "phone",
    "country", "guests", "unit_price", "total_price", "currency",
    "promo", "discount", "deposit_due", "deposit_paid",
    "date", "hotel", "cruise_port", "cruise_ship", "status", "payment", "created",
  ];
  const lines = [header.join(",")];
  for (const b of bookings) {
    lines.push(
      [
        b.reference, b.kind, b.tour_title, b.transfer_label ?? "",
        b.customer_name, b.customer_email, b.customer_phone,
        b.customer_country ?? "", b.guests, b.unit_price, b.total_price,
        b.currency, b.promo_code ?? "", b.discount_amount,
        b.deposit_due, b.deposit_paid, b.booked_for ?? "", b.hotel ?? "",
        b.cruise_port ?? "", b.cruise_ship ?? "", b.status, b.payment_status, b.created_at,
      ]
        .map(cell)
        .join(","),
    );
  }

  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
