/**
 * Usuarios: staff (gestión completa) y clientes registrados (lectura +
 * promoción manual). Solo rol `admin`.
 */
import { notFound } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { listCustomers, listStaff } from "@/lib/admin/users";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { CreateStaffForm } from "./CreateStaffForm";
import { UserRowActions } from "./UserRowActions";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function UsersPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const session = await verifySession(locale);
  if (session.user.role !== "admin") notFound();

  const [staff, customers] = await Promise.all([
    listStaff(locale),
    listCustomers(locale),
  ]);

  const es = locale === "es";
  const copy = {
    title: es ? "Usuarios" : "Users",
    staff: es ? "Personal (staff)" : "Staff",
    customers: es ? `Clientes registrados (${customers.length})` : `Registered customers (${customers.length})`,
    name: es ? "Nombre" : "Name",
    role: es ? "Rol" : "Role",
    state: es ? "Estado" : "State",
    active: es ? "Activo" : "Active",
    inactive: es ? "Inactivo" : "Inactive",
    since: es ? "Desde" : "Since",
    actions: es ? "Acciones" : "Actions",
    noCustomers: es ? "Aún no hay clientes registrados." : "No registered customers yet.",
    customerNote: es
      ? "Los clientes se registran solos desde la web. Promociona manualmente a quien necesite acceso al panel."
      : "Customers self-register on the site. Manually promote whoever needs panel access.",
    form: {
      title: es ? "Crear miembro del staff" : "Create staff member",
      name: es ? "Nombre" : "Name",
      email: es ? "Correo" : "Email",
      password: es ? "Contraseña (mín. 8)" : "Password (min. 8)",
      role: es ? "Rol" : "Role",
      editor: es ? "Editor" : "Editor",
      admin: es ? "Admin" : "Admin",
      submit: es ? "Crear" : "Create",
      errors: es
        ? {
            "bad-name": "Nombre demasiado corto.",
            "bad-email": "Correo inválido.",
            "weak-password": "Contraseña débil (mín. 8).",
            "bad-role": "Rol inválido.",
            "email-taken": "Ese correo ya está registrado.",
          }
        : {
            "bad-name": "Name too short.",
            "bad-email": "Invalid email.",
            "weak-password": "Weak password (min. 8).",
            "bad-role": "Invalid role.",
            "email-taken": "That email is already registered.",
          },
    },
    row: {
      activate: es ? "Activar" : "Activate",
      deactivate: es ? "Desactivar" : "Deactivate",
      promote: es ? "Hacer staff" : "Make staff",
      makeEditor: es ? "→ Editor" : "→ Editor",
      makeAdmin: es ? "→ Admin" : "→ Admin",
      remove: es ? "Eliminar" : "Delete",
      confirmRemove: es
        ? "¿Eliminar este usuario? Se cerrarán sus sesiones."
        : "Delete this user? Their sessions will be closed.",
      done: "OK",
      failed: es ? "No se pudo aplicar" : "Could not apply",
    },
  };

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{copy.title}</h1>

      <CreateStaffForm locale={locale} labels={copy.form} />

      <section className="grid gap-3 md:hidden">
        {staff.map((u) => (
          <div key={u.id} className={`rounded-2xl border border-sand-200 bg-white p-4 ${u.id === session.user.id ? "ring-1 ring-ocean-300" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink-900">{u.name}</p>
              <span className="rounded-full bg-ocean-100 px-2.5 py-1 text-xs font-bold text-ocean-800">
                {u.role}
              </span>
            </div>
            <p className="mt-0.5 break-all text-xs text-ink-500">{u.email}</p>
            <p className="mt-1 text-xs text-ink-500">
              {u.is_active === 1 ? copy.active : copy.inactive}
            </p>
            <div className="mt-3">
              <UserRowActions locale={locale} user={u} isMe={u.id === session.user.id} labels={copy.row} />
            </div>
          </div>
        ))}
      </section>

      <section className="hidden overflow-x-auto rounded-2xl border border-sand-200 bg-white md:block">
        <h2 className="px-4 pt-4 font-display text-lg font-bold text-ink-900">{copy.staff}</h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-500">
              <th className="px-4 py-3">{copy.name}</th>
              <th className="px-4 py-3">{copy.role}</th>
              <th className="px-4 py-3">{copy.state}</th>
              <th className="px-4 py-3">{copy.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {staff.map((u) => (
              <tr key={u.id} className={u.id === session.user.id ? "bg-ocean-50/50" : ""}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{u.name}</p>
                  <p className="text-xs text-ink-500">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-ocean-100 px-2.5 py-1 text-xs font-bold text-ocean-800">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {u.is_active === 1 ? copy.active : copy.inactive}
                </td>
                <td className="px-4 py-3">
                  <UserRowActions locale={locale} user={u} isMe={u.id === session.user.id} labels={copy.row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink-900">{copy.customers}</h2>
        <p className="mt-1 text-xs text-ink-500">{copy.customerNote}</p>
        {customers.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{copy.noCustomers}</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-100">
            {customers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-ink-900">{u.name}</p>
                  <p className="text-xs text-ink-500">
                    {u.email} · {copy.since} {u.created_at.slice(0, 10)}
                  </p>
                </div>
                <UserRowActions locale={locale} user={u} isMe={false} labels={copy.row} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
