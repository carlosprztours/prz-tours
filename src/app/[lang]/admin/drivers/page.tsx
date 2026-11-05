import { requireSection } from "@/lib/admin/access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listStaff } from "@/lib/admin/users";
import { isLocale } from "@/lib/i18n";

export default async function DriversPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireSection(lang, "drivers");
  const es = lang === "es";
  const drivers = (await listStaff(lang)).filter((u) => u.role === "driver");
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5">
      <h1 className="text-2xl font-bold">{es ? "Conductores" : "Drivers"}</h1>
      <Link className="underline" href={`/${lang}/admin/users`}>{es ? "Gestionar conductores en Usuarios" : "Manage drivers in Users"}</Link>
      <ul className="divide-y">
        {drivers.map((d) => <li key={d.id} className="py-2">{d.name} · {d.is_active ? (es ? "Activo" : "Active") : (es ? "Inactivo" : "Inactive")}</li>)}
      </ul>
    </section>
  );
}
