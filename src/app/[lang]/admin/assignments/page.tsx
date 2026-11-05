import { requireSection } from "@/lib/admin/access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assignService, listAssignmentOptions, listServices } from "@/lib/admin/operations";
import { isLocale } from "@/lib/i18n";
import { OperationForm } from "../OperationForm";

export default async function AssignmentsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireSection(lang, "assignments");
  const { drivers, bookings } = await listAssignmentOptions(lang);
  const services = await listServices(lang);
  const es = lang === "es";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{es ? "Servicios y asignaciones" : "Services and assignments"}</h1>
      <section className="space-y-3 rounded-2xl bg-white p-5">
        <h2 className="text-lg font-bold">{es ? "Asignar o reasignar una reserva confirmada" : "Assign or reassign a confirmed booking"}</h2>
        <p className="text-sm">{es ? "Se bloquean coincidencias exactas de fecha y hora. Revisa también la duración y el tiempo de traslado." : "Exact date and time conflicts are blocked. Also check duration and travel time."}</p>
        <OperationForm action={assignService.bind(null, lang)} lang={lang} label={es ? "Asignar" : "Assign"}>
          <label className="grid gap-1 font-semibold">
            {es ? "Reserva" : "Booking"}
            <select name="booking" required defaultValue="" className="rounded-xl border p-2">
              <option value="" disabled>{es ? "Seleccionar" : "Select"}</option>
              {bookings.map((b) => <option key={b.id} value={`${b.id}:${b.assignment_id ?? 0}`}>
                {b.reference} · {b.booked_for ?? "—"} {b.pickup_time} · {b.assignment_id ? (es ? "Asignada" : "Assigned") : (es ? "Sin asignar" : "Unassigned")}
              </option>)}
            </select>
          </label>
          <label className="grid gap-1 font-semibold">
            {es ? "Conductor" : "Driver"}
            <select name="driver" required defaultValue="" className="rounded-xl border p-2">
              <option value="" disabled>{es ? "Seleccionar" : "Select"}</option>
              {drivers.filter((d) => d.is_active === 1).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        </OperationForm>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{es ? "Asignaciones e historial" : "Assignments and history"}</h2>
        <ul className="grid gap-2">
          {services.map((s) => <li key={s.id} className="rounded-xl bg-white p-3">
            <Link className="underline" href={`/${lang}/admin/services/${s.id}`}>{s.reference} · {s.driver_name}</Link>
            {" · "}{s.withdrawn_at ? (es ? "Retirada" : "Withdrawn") : s.finished_at ? (es ? "Finalizada" : "Finished") : s.started_at ? (es ? "En curso" : "In progress") : s.arrived_at ? (es ? "Llegó" : "Arrived") : (es ? "Asignada" : "Assigned")}
          </li>)}
        </ul>
      </section>
    </div>
  );
}
