/**
 * Mi cuenta: datos del cliente y sus reservas (por email de la cuenta).
 *
 * Requiere sesión (cualquier rol). El staff también puede entrar aquí.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { logout } from "@/lib/actions/auth";
import { verifyCustomerSession } from "@/lib/auth/dal";
import { queryOne } from "@/lib/db/client";
import { listBookingsByEmail } from "@/lib/db/bookings";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const session = await verifyCustomerSession(locale);
  const profile = await queryOne<{ name: string; phone: string | null }>(
    `SELECT name, phone FROM users WHERE id = ?`,
    session.user.id,
  );
  const bookings = await listBookingsByEmail(session.user.email);

  const es = locale === "es";
  const copy = {
    title: es ? "Mi cuenta" : "My account",
    hello: es ? "Hola" : "Hi",
    myBookings: es ? "Mis reservas" : "My bookings",
    noBookings: es
      ? "Todavía no tienes reservas con este correo."
      : "You have no bookings with this email yet.",
    explore: es ? "Explorar tours" : "Explore tours",
    signOut: es ? "Cerrar sesión" : "Sign out",
    guests: es ? "personas" : "guests",
    panel: es ? "Ir al panel" : "Go to panel",
    profile: es
      ? {
          title: "Mis datos",
          subtitle: "Se usan para pre-rellenar tus reservas.",
          name: "Nombre completo",
          email: "Correo electrónico",
          phone: "Teléfono / WhatsApp",
          save: "Guardar datos",
          saving: "Guardando…",
          saved: "Datos guardados.",
          errors: {
            "bad-name": "Escribe tu nombre (mínimo 2 letras).",
            "bad-phone": "Ese teléfono no parece válido.",
          },
        }
      : {
          title: "My details",
          subtitle: "Used to pre-fill your bookings.",
          name: "Full name",
          email: "Email address",
          phone: "Phone / WhatsApp",
          save: "Save details",
          saving: "Saving…",
          saved: "Details saved.",
          errors: {
            "bad-name": "Please enter your name (at least 2 letters).",
            "bad-phone": "That phone number doesn't look valid.",
          },
        },
  };
  const isStaff = session.user.role === "admin" || session.user.role === "editor";

  return (
    <div className="bg-sand-50/50 py-12">
      <div className="container-site max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink-900">
              {copy.hello}, {session.user.name}
            </h1>
            <p className="mt-1 text-sm text-ink-500">{session.user.email}</p>
          </div>
          <div className="flex gap-2">
            {isStaff && (
              <Link
                href={`/${locale}/admin`}
                className="inline-flex h-10 items-center rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
              >
                {copy.panel}
              </Link>
            )}
            <form action={logout.bind(null, locale)}>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-full border border-sand-200 bg-white px-5 text-sm font-bold text-ink-700 transition hover:ring-1 hover:ring-ocean-300"
              >
                {copy.signOut}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8">
          <ProfileForm
            locale={locale}
            initial={{
              name: profile?.name ?? session.user.name,
              email: session.user.email,
              phone: profile?.phone ?? "",
            }}
            labels={copy.profile}
          />
        </div>

        <div className="mt-5">
          <PasswordForm
            locale={locale}
            labels={
              es
                ? {
                    title: "Cambiar contraseña",
                    current: "Contraseña actual",
                    next: "Nueva contraseña",
                    hint: "Mínimo 8 caracteres. Se cerrarán tus otras sesiones.",
                    save: "Cambiar contraseña",
                    saving: "Cambiando…",
                    saved: "Contraseña actualizada.",
                    errors: {
                      weak: "La nueva debe tener al menos 8 caracteres.",
                      same: "La nueva debe ser distinta a la actual.",
                      wrong: "La actual no es correcta.",
                    },
                  }
                : {
                    title: "Change password",
                    current: "Current password",
                    next: "New password",
                    hint: "At least 8 characters. Your other sessions will close.",
                    save: "Change password",
                    saving: "Changing…",
                    saved: "Password updated.",
                    errors: {
                      weak: "The new one must be at least 8 characters.",
                      same: "The new one must differ from the current.",
                      wrong: "The current one is incorrect.",
                    },
                  }
            }
          />
        </div>

        <h2 className="mt-10 font-display text-xl font-extrabold text-ink-900">
          {copy.myBookings} · {bookings.length}
        </h2>
        {bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-8 text-center">
            <p className="text-sm text-ink-500">{copy.noBookings}</p>
            <Link
              href={`/${locale}/tours`}
              className="mt-4 inline-flex h-11 items-center rounded-full bg-coral-700 px-6 text-sm font-bold text-white transition hover:bg-coral-800"
            >
              {copy.explore}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-5"
              >
                <div>
                  <p className="font-display text-lg font-extrabold text-ink-900">
                    {b.reference}
                  </p>
                  <p className="text-sm text-ink-700">
                    {b.tour_title || b.transfer_label || "—"}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {[b.booked_for, `${b.guests} ${copy.guests}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} locale={locale} />
                  <span className="font-display text-xl font-extrabold text-ink-900">
                    ${b.total_price}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
