/**
 * Aviso de cookies al pie (componente de cliente).
 *
 * Muestra el banner una sola vez y guarda la decisión en `localStorage` con la
 * clave `prz_cookie_consent`. Como hoy solo hay cookies técnicas necesarias, el
 * banner es informativo: «Aceptar» y «Rechazar» guardan la decisión y cierran,
 * y el resto de la web no cambia porque ningún script de terceros se carga.
 *
 * `footerClick` permite cambiar de idea: un botón «Cookies» en el footer abre
 * el aviso de nuevo.
 */
"use client";

import { useEffect, useState } from "react";

export const COOKIE_CONSENT_KEY = "prz_cookie_consent";

type Decision = "accepted" | "rejected";

export function CookieBanner({
  locale,
}: {
  locale: "es" | "en";
}) {
  const es = locale === "es";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!stored) setVisible(true);
    } catch {
      // Al fallar localStorage (modo privado) mostramos el aviso igualmente.
      setVisible(true);
    }

    // Permite reabrirlo desde el pie ("Preferencias de cookies").
    const open = () => setVisible(true);
    window.addEventListener("prz:open-cookie-banner", open);
    return () => window.removeEventListener("prz:open-cookie-banner", open);
  }, []);

  const decide = (d: Decision) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, d);
      // Cookie opcional por si hay que ofrecer olvidarlo en el futuro.
      document.cookie = `${COOKIE_CONSENT_KEY}=${d};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* sin storage, se cierra igualmente */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-3 max-w-3xl rounded-2xl border border-sand-200 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur"
    >
      <p className="text-sm text-ink-700">
        {es
          ? "Usamos cookies técnicas necesarias para que inicies sesión y reserves. No usamos rastreo ni anuncios. "
          : "We use strictly necessary cookies so you can sign in and book. We do not use tracking or ads. "}
        <a href={`/${locale}/cookies`} className="font-semibold text-ocean-700 underline">
          {es ? "Más información" : "Learn more"}
        </a>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="rounded-full bg-ocean-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "Aceptar" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          className="rounded-full border border-sand-300 px-4 py-2 text-xs font-bold text-ink-700 transition hover:bg-sand-50"
        >
          {es ? "Rechazar" : "Reject"}
        </button>
      </div>
    </div>
  );
}
