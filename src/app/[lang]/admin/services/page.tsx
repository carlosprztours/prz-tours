import Link from "next/link";
import { notFound } from "next/navigation";
import { listServices } from "@/lib/admin/operations";
import { isLocale } from "@/lib/i18n";

export default async function ServicesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const es = lang === "es";
  const services = await listServices(lang);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{es ? "Panel de conducción" : "Driver panel"}</h1>
      {[false, true].map((history) => {
        const rows = services.filter((s) => Boolean(s.withdrawn_at || s.finished_at) === history);
        return (
          <section key={String(history)} className="space-y-3">
            <h2 className="text-lg font-bold">{history ? (es ? "Historial" : "History") : (es ? "Asignaciones" : "Assignments")}</h2>
            {!rows.length && <p>{es ? "No hay servicios." : "No services."}</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((s) => <li key={s.id}>
                <Link className="block rounded-xl bg-white p-4 ring-1 ring-sand-200" href={`/${lang}/admin/services/${s.id}`}>
                  <strong>{s.reference} · {s.destination}</strong>
                  <span className="block">{s.booked_for ?? "—"} {s.pickup_time} · {s.driver_name}</span>
                </Link>
              </li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
