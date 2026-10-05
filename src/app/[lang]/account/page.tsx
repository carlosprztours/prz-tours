/**
 * Mi cuenta: datos del cliente y sus reservas (por email de la cuenta).
 *
 * Requiere sesión (cualquier rol). El staff también puede entrar aquí.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { CouponsSection } from "@/components/auth/CouponsSection";
import { InviteLink } from "@/components/auth/InviteLink";
import { NotificationsSection } from "@/components/auth/NotificationsSection";
import { PasskeysSection } from "@/components/auth/PasskeysSection";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { logout } from "@/lib/actions/auth";
import { verifyCustomerSession } from "@/lib/auth/dal";
import { listUserCredentials } from "@/lib/auth/webauthn";
import {
  getOrCreateInviteCode,
  listUserCoupons,
  listUserNotifications,
} from "@/lib/db/loyalty";
import { queryOne } from "@/lib/db/client";
import { hasSubscription } from "@/lib/db/push";
import { listBookingsByEmail } from "@/lib/db/bookings";
import { getDictionary, isLocale } from "@/lib/i18n";
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
  const [inviteCode, coupons, notifications, dict, subscribed] = await Promise.all([
    getOrCreateInviteCode(session.user.id),
    listUserCoupons(session.user.id),
    listUserNotifications(session.user.id, 20),
    getDictionary(locale),
    hasSubscription(session.user.id),
  ]);
  const passkeys = await listUserCredentials(session.user.id);

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
    invite: es
      ? {
          title: "Invita y regala 10 %",
          subtitle: "Quien se registre con tu enlace recibe un 10 % de un solo uso en su primera reserva.",
          copy: "Copiar enlace",
          copied: "¡Copiado!",
        }
      : {
          title: "Invite and gift 10 % off",
          subtitle: "Whoever signs up with your link gets single-use 10 % off their first booking.",
          copy: "Copy link",
          copied: "Copied!",
        },
    coupons: es
      ? {
          title: "Mis cupones",
          subtitle: "Escríbelos en el campo promocional al reservar. Uno activo por cuenta.",
          copy: "Copiar",
          copied: "¡Copiado!",
          empty: "Aún no tienes cupones. Viaja 2 veces o invita amigos para ganar un 10 %.",
          expires: "Vence",
          usedOn: "Usado",
          statusUsed: "Usado",
          statusExpired: "Vencido",
        }
      : {
          title: "My coupons",
          subtitle: "Enter them in the promo field when booking. One active per account.",
          copy: "Copy",
          copied: "Copied!",
          empty: "No coupons yet. Travel twice or invite friends to earn 10 % off.",
          expires: "Expires",
          usedOn: "Used",
          statusUsed: "Used",
          statusExpired: "Expired",
        },
    notifications: es
      ? {
          title: "Avisos",
          empty: "Sin avisos por ahora.",
          markAll: "Marcar leídos",
        }
      : {
          title: "Notifications",
          empty: "No notifications yet.",
          markAll: "Mark all read",
        },
    passkeys: es
      ? {
          title: "Passkeys",
          subtitle: "Entra con tu huella, Face ID o el PIN de tu dispositivo, sin contraseña.",
          add: "Agregar passkey",
          adding: "Sigue las instrucciones de tu dispositivo…",
          devicePlaceholder: "Nombre (p. ej. Mi iPhone)",
          remove: "Eliminar",
          empty: "Aún no tienes passkeys en este dispositivo.",
          errors: {
            failed: "No se pudo completar. Inténtalo de nuevo.",
            duplicate: "Este dispositivo ya está registrado.",
            unsupported: "Tu navegador no soporta passkeys en este dispositivo.",
          },
        }
      : {
          title: "Passkeys",
          subtitle: "Sign in with your fingerprint, Face ID or device PIN — no password needed.",
          add: "Add passkey",
          adding: "Follow your device prompts…",
          devicePlaceholder: "Name (e.g. My iPhone)",
          remove: "Remove",
          empty: "No passkeys on this device yet.",
          errors: {
            failed: "Could not complete. Please try again.",
            duplicate: "This device is already registered.",
            unsupported: "Your browser doesn't support passkeys on this device.",
          },
        },
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

        <div className="mt-5">
          <PasskeysSection
            credentials={passkeys.map((p) => ({
              id: p.id,
              device_name: p.device_name,
              created_at: p.created_at,
            }))}
            labels={copy.passkeys}
          />
        </div>

        <div className="mt-5">
          <NotificationsSection initial={notifications} labels={copy.notifications} />
        </div>

        {session.user.role === "customer" && (
          <div className="mt-5">
            <PwaInstallPrompt
              labels={dict.pwa}
              alreadyInstalled={false}
              alreadySubscribed={subscribed}
              force
              inline
            />
          </div>
        )}

        <div className="mt-5">
          <CouponsSection coupons={coupons} labels={copy.coupons} />
        </div>

        <div className="mt-5">
          <InviteLink locale={locale} code={inviteCode} labels={copy.invite} />
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
