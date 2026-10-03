/**
 * 404 global (sin idioma conocido): ofrece ambos idiomas.
 */
import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl font-extrabold text-ocean-600">404</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
          Página no encontrada · Page not found
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          La página que buscas no existe o fue movida. · The page you are
          looking for does not exist or was moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/es"
            className="inline-flex h-11 items-center rounded-full bg-ocean-600 px-6 text-sm font-bold text-white transition hover:bg-ocean-700"
          >
            Ir al inicio
          </Link>
          <Link
            href="/en"
            className="inline-flex h-11 items-center rounded-full border-2 border-ocean-600 px-6 text-sm font-bold text-ocean-700 transition hover:bg-ocean-600 hover:text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
