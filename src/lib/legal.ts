/**
 * Contenido de las páginas legales, en ES y EN.
 *
 * Es una base razonable para una agencia de viajes en la República
 * Dominicana (Ley 172-13, equivalente al RGPD europeo). **El cliente debe
 * revisarla** y, si hace falta, adaptarla con asesoría: campos como el RNC o
 * el registro de intermediario de viajes deben completarse.
 */

import type { Locale } from "@/types";

type Parrafo = { subtitulo?: string; texto: string };
type Legales = {
  aviso: { titulo: string; parrafos: Parrafo[] };
  privacidad: { titulo: string; parrafos: Parrafo[] };
  cookies: { titulo: string; parrafos: Parrafo[] };
};

const ES: Legales = {
  aviso: {
    titulo: "Aviso legal",
    parrafos: [
      {
        texto:
          "Pérez Tours & Transfers es una agencia de viajes y traslados con sede en Puerto Plata, República Dominicana. Esta web publicita y vende excursiones y traslados en el norte del país.",
      },
      {
        subtitulo: "Datos de contacto",
        texto:
          "Dirección: Puerto Plata, República Dominicana.\nCorreo: asistencia@perez-tours.com\nTeléfono/WhatsApp: +1 809 000 0000\nHorario: 08:00–20:00 (hora local).",
      },
      {
        subtitulo: "Responsable",
        texto:
          "El responsable de esta web y del tratamiento de sus datos es Pérez Tours & Transfers. Por defecto aplican los datos que suministres al reservar, registrarte o escribirnos.",
      },
      {
        subtitulo: "Enlaces externos",
        texto:
          "Los enlaces a terceros (Google, WhatsApp, redes o proveedores de pago) son responsabilidad de sus respectivos dueños.",
      },
    ],
  },
  privacidad: {
    titulo: "Política de privacidad",
    parrafos: [
      {
        texto:
          "Tratamos tus datos exclusivamente para gestionar tus reservas, traslados, fidelidad, reseñas y mejorar el servicio.",
      },
      {
        subtitulo: "Qué datos guardamos",
        texto:
          "Nombre, correo, teléfono, hotel, fechas de viaje y monto de la reserva. Al crear cuenta también guardamos tus datos de acceso (contraseña cifrada) y, si utilizas Google, tu identificador de Google.",
      },
      {
        subtitulo: "Terceros que tratan tus datos",
        texto:
          "Cloudflare (hospedaje y seguridad), ImageKit (fotos), Resend (envío de correos) y Google (inicio de sesión y mapas). No vendemos tus datos a nadie.",
      },
      {
        subtitulo: "Cuánto los guardamos",
        texto:
          "Las reservas y los correos, durante el tiempo necesario para cumplir obligaciones fiscales y legales. Las cuentas activas, mientras las uses.",
      },
      {
        subtitulo: "Tus derechos",
        texto:
          "Puedes pedirnos acceso, rectificación o supresión de tus datos en cualquier momento escribiendo a asistencia@perez-tours.com.",
      },
    ],
  },
  cookies: {
    titulo: "Aviso de cookies",
    parrafos: [
      {
        texto:
          "Esta web utiliza cookies estrictamente necesarias para su funcionamiento. No usamos cookies de rastreo ni analítica por defecto.",
      },
      {
        subtitulo: "Cookies que usamos",
        texto:
          "• prz_session — mantiene tu sesión iniciada.\n• prz_oauth_state — protege el inicio de sesión con Google contra ataques.\n• reto WebAuthn — en tu navegador, para el inicio de sesión con huella/llave de seguridad.\n• prz_cookie_consent — recuerda tu decisión en este aviso.",
      },
      {
        subtitulo: "Cómo controlarlas",
        texto:
          "Puedes borrarlas o bloquearlas desde la configuración de tu navegador. Si las bloqueas, algunas funciones como iniciar sesión dejarán de funcionar, pero el resto de la web seguirá cargando.",
      },
    ],
  },
};

const EN: Legales = {
  aviso: {
    titulo: "Legal notice",
    parrafos: [
      {
        texto:
          "Pérez Tours & Transfers is a travel and transfer agency based in Puerto Plata, Dominican Republic. This site promotes and sells excursions and transfers in the north of the country.",
      },
      {
        subtitulo: "Contact",
        texto:
          "Address: Puerto Plata, Dominican Republic.\nEmail: asistencia@perez-tours.com\nPhone/WhatsApp: +1 809 000 0000\nHours: 08:00–20:00 (local time).",
      },
      {
        subtitulo: "Responsible party",
        texto:
          "The responsible party for this site and for the processing of your data is Pérez Tours & Transfers. Only the data you provide when booking, signing up or writing to us apply.",
      },
      {
        subtitulo: "External links",
        texto:
          "Links to third parties (Google, WhatsApp, social networks or payment providers) are the responsibility of their respective owners.",
      },
    ],
  },
  privacidad: {
    titulo: "Privacy policy",
    parrafos: [
      {
        texto:
          "We use your data only to manage your bookings, transfers, loyalty, reviews and to improve the service.",
      },
      {
        subtitulo: "What we store",
        texto:
          "Name, email, phone, hotel, travel dates and booking amount. If you create an account we also store your login credentials (hashed password) and, if you use Google, your Google identifier.",
      },
      {
        subtitulo: "Third-party processors",
        texto:
          "Cloudflare (hosting and security), ImageKit (photos), Resend (email delivery) and Google (login and maps). We do not sell your data.",
      },
      {
        subtitulo: "How long we keep it",
        texto:
          "Bookings and emails for as long as required by tax and legal obligations. Active accounts while you use them.",
      },
      {
        subtitulo: "Your rights",
        texto:
          "You can request access, rectification or deletion of your data at any time by writing to asistencia@perez-tours.com.",
      },
    ],
  },
  cookies: {
    titulo: "Cookie notice",
    parrafos: [
      {
        texto:
          "This site uses strictly necessary cookies to work. We do not use tracking or analytics cookies by default.",
      },
      {
        subtitulo: "Cookies we use",
        texto:
          "• prz_session — keeps you signed in.\n• prz_oauth_state — protects Google sign-in from attacks.\n• WebAuthn challenge — in your browser, for fingerprint/security-key sign-in.\n• prz_cookie_consent — remembers your choice on this notice.",
      },
      {
        subtitulo: "How to control them",
        texto:
          "You can delete or block cookies from your browser settings. If you block them, some features like signing in will stop working, but the rest of the site will still load.",
      },
    ],
  },
};

export function getLegal(locale: Locale, clave: "aviso" | "privacidad" | "cookies") {
  return (locale === "es" ? ES : EN)[clave];
}

export function getActualizado(locale: Locale) {
  return locale === "es"
    ? "Última actualización: octubre 2026"
    : "Last updated: October 2026";
}
