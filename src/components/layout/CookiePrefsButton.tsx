/**
 * Botón «Preferencias de cookies» del pie.
 *
 * Es un componente de cliente porque dispara un evento que vuelve a abrir el
 * banner de cookies (montado en el layout con idioma). Sin este botón, una vez
 * aceptadas o rechazadas las cookies no había forma de cambiar de opinión.
 */
"use client";

export function CookiePrefsButton({ locale }: { locale: "es" | "en" }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event("prz:open-cookie-banner"))
      }
      className="hover:text-white hover:underline"
    >
      {locale === "es" ? "Preferencias de cookies" : "Cookie preferences"}
    </button>
  );
}
