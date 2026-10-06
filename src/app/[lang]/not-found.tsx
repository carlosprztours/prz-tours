/**
 * 404 con la marca visible y una vuelta al inicio.
 *
 * Antes, si alguien escribía una URL mala o el idioma no era válido, salía la
 * página genérica de Next sin header ni estilo de Perez Tours.
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-sand-50/50 px-4 py-20 text-center">
      <div>
        <p className="font-display text-6xl font-extrabold text-ocean-700">404</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-900">
          No encontramos esa página
        </h1>
        <p className="mt-2 text-ink-700">
          Es posible que la dirección esté mal escrita o que la página se haya
          movido.
        </p>
        <Link
          href="/es"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-coral-700 px-8 font-display text-base font-bold text-white shadow-xl shadow-coral-500/30 transition hover:bg-coral-800"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
