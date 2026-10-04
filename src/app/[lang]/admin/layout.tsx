/**
 * Layout del panel: verifica sesión, muestra sidebar y contenido.
 *
 * Todas las rutas bajo /[lang]/admin pasan por `verifySession()` (seguro:
 * firma + BD + usuario activo). El proxy ya hizo la comprobación optimista.
 */
import Link from "next/link";

import { logout } from "@/lib/actions/auth";
import { verifySession } from "@/lib/auth/dal";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { notFound } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const session = await verifySession(locale);

  const base = `/${locale}/admin`;
  const nav = [
    { href: base, label: locale === "es" ? "Panel" : "Dashboard", exact: true },
    { href: `${base}/bookings`, label: locale === "es" ? "Reservas" : "Bookings" },
    { href: `${base}/occupancy`, label: locale === "es" ? "Ocupación" : "Occupancy" },
    { href: `${base}/tours`, label: locale === "es" ? "Tours" : "Tours" },
    { href: `${base}/transfers`, label: locale === "es" ? "Traslados" : "Transfers" },
    { href: `${base}/testimonials`, label: locale === "es" ? "Opiniones" : "Reviews" },
    { href: `${base}/promos`, label: locale === "es" ? "Promos" : "Promos" },
    { href: `${base}/blog`, label: "Blog" },
    { href: `${base}/faq`, label: "FAQ" },
    { href: `${base}/gallery`, label: locale === "es" ? "Galería" : "Gallery" },
    { href: `${base}/messages`, label: locale === "es" ? "Mensajes" : "Messages" },
    { href: `${base}/settings`, label: locale === "es" ? "Ajustes" : "Settings" },
    ...(session.user.role === "admin"
      ? [
          { href: `${base}/users`, label: locale === "es" ? "Usuarios" : "Users" },
          { href: `${base}/activity`, label: locale === "es" ? "Actividad" : "Activity" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-30 border-b border-sand-200 bg-ocean-950 text-white">
        <div className="container-site flex h-16 items-center justify-between gap-2 sm:gap-3">
          <Link href={base} className="truncate font-display text-base font-bold sm:text-lg">
            <span className="hidden sm:inline">Perez Tours · </span>Panel
          </Link>
          <div className="flex shrink-0 items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            <span className="hidden text-white/70 sm:block">
              {session.user.name} · {session.user.role}
            </span>
            <Link
              href={`/${locale}`}
              className="rounded-full border border-white/25 px-2.5 py-1.5 font-semibold transition hover:bg-white/10 sm:px-3"
            >
              {locale === "es" ? "Ver sitio" : "View site"}
            </Link>
            <form action={logout.bind(null, locale)}>
              <button
                type="submit"
                className="rounded-full bg-white/10 px-2.5 py-1.5 font-semibold transition hover:bg-white/20 sm:px-3"
              >
                {locale === "es" ? "Salir" : "Log out"}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-site grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Panel" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="block rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-700 ring-1 ring-sand-200 transition hover:ring-ocean-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
