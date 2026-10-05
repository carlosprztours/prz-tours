# Mapa de rutas y archivos — prz-web

> Para qué sirve: cuando pidan cambiar algo, busca aquí la URL o la
> funcionalidad y ve directo al archivo. Rutas relativas a `prz-web/`.

Convenciones: todo lo público vive bajo `src/app/[lang]/` (`/es`, `/en`).
El idioma lo inyecta el proxy (`src/proxy.ts`) vía cabecera `x-locale`.

---

## 1. Páginas públicas (URL → archivo)

| URL | Archivo | Qué es |
|---|---|---|
| `/es`, `/en` | `src/app/[lang]/page.tsx` | Home: Hero, destacados, testimonios, galería, CTA |
| `/es/tours`, `/en/tours` | `src/app/[lang]/tours/page.tsx` | Catálogo de tours + filtros |
| `/es/tours/[slug]` | `src/app/[lang]/tours/[slug]/page.tsx` | Detalle de tour: galería, info, precio, `BookingForm`, reseñas |
| `/es/transfers` | `src/app/[lang]/transfers/page.tsx` | Tabla de rutas de traslado + CTA a `/book?type=transfer` |
| `/es/book` (con `?type=tour|transfer|custom` y `?route=`) | `src/app/[lang]/book/page.tsx` | Reserva de tour / traslado / tour a medida (`BookingForm`) |
| `/es/book/success?ref=` | `src/app/[lang]/book/success/page.tsx` | Vuelta de Stripe tras pagar: muestra la reserva |
| `/es/about` | `src/app/[lang]/about/page.tsx` | Nosotros: misión, experiencia local, calidad |
| `/es/contact` | `src/app/[lang]/contact/page.tsx` | Contacto + `ContactForm` |
| `/es/track?ref=&email=` | `src/app/[lang]/track/page.tsx` | Consulta tu reserva (referencia + email) |
| `/es/blog` | `src/app/[lang]/blog/page.tsx` | Índice del blog |
| `/es/blog/[slug]` | `src/app/[lang]/blog/[slug]/page.tsx` | Artículo del blog |
| `/es/login` | `src/app/[lang]/login/page.tsx` + `LoginForm.tsx` | Entrada staff/clientes |
| `/es/signup` | `src/app/[lang]/signup/page.tsx` + `SignupForm.tsx` | Crear cuenta |
| `/es/account` | `src/app/[lang]/account/page.tsx` (+ `ProfileForm.tsx`, `PasswordForm.tsx`) | Mi cuenta: datos + reservas por email |
| `/` (sin idioma) | `src/app/page.tsx` | Redirige al idioma detectado |
| Layout público | `src/app/[lang]/layout.tsx` | Monta header + WhatsApp flotante + footer en toda la web |
| Layout raíz | `src/app/layout.tsx` | `<html>`, fuentes, `metadata` (título, iconos), service worker |

## 2. Panel admin (URL → archivo, todo bajo `src/app/[lang]/admin/`)

Layout con sidebar y verificación de sesión: `admin/layout.tsx`.

| URL | Archivo(s) |
|---|---|
| `/es/admin` | `admin/page.tsx` (dashboard: métricas, recientes) |
| `/es/admin/bookings` | `admin/bookings/page.tsx` (lista + filtros) |
| `/es/admin/bookings/[id]` | `admin/bookings/[id]/page.tsx` + `BookingActions.tsx` (detalle, estados, WhatsApp) |
| `/es/admin/occupancy` | `admin/occupancy/page.tsx` (ocupación por fecha) |
| `/es/admin/tours`, `/new`, `/[id]` | `admin/tours/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `TourForm.tsx` |
| `/es/admin/transfers`, `/new`, `/[id]` | `admin/transfers/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `TransferForm.tsx` |
| `/es/admin/testimonials`, `/new`, `/[id]` | `admin/testimonials/...` + `TestimonialForm.tsx` |
| `/es/admin/coupons` | `admin/coupons/page.tsx` + `CouponCreateForm.tsx` | Cupones personales: crear manual, enviar correo, cancelar |
| `/es/admin/promos`, `/new`, `/[id]` | `admin/promos/...` + `PromoForm.tsx` | Códigos genéricos (cualquiera puede usarlos) |
| `/es/admin/blog`, `/new`, `/[id]` | `admin/blog/...` + `ArticleForm.tsx` |
| `/es/admin/faq`, `/new`, `/[id]` | `admin/faq/...` + `FaqForm.tsx` |
| `/es/admin/gallery` | `admin/gallery/page.tsx` + `AddImageForm.tsx` |
| `/es/admin/messages` | `admin/messages/page.tsx` (mensajes de contacto) |
| `/es/admin/users` | `admin/users/page.tsx` + `UserRowActions.tsx` + `CreateStaffForm.tsx` |
| `/es/admin/settings` | `admin/settings/page.tsx` (ajustes: whatsapp, email, etc.) |
| `/es/admin/activity` | `admin/activity/page.tsx` (historial) |

## 3. API (URL → archivo, bajo `src/app/api/`)

| URL | Archivo |
|---|---|
| `POST /api/admin/upload` | `api/admin/upload/route.ts` (sube imagen a R2, solo staff) |
| `GET /api/admin/export/bookings` | `api/admin/export/bookings/route.ts` (CSV de reservas) |
| `GET /api/media/...` | `api/media/[...key]/route.ts` (sirve imágenes de R2) |
| `POST /api/stripe/checkout` | `api/stripe/checkout/route.ts` (pago de anticipo) |
| `POST /api/stripe/webhook` | `api/stripe/webhook/route.ts` (confirma pagos) |
| `POST /api/auth/clear` | `api/auth/clear/route.ts` (cierra sesión) |

## 4. Componentes (`src/components/`)

| Carpeta | Archivos | Uso |
|---|---|---|
| `auth/` | `GoogleButton.tsx`, `ModalLoginForm.tsx` (login sin navegar para el modal), `PasskeysSection.tsx`, `CouponsSection.tsx`, `InviteLink.tsx`, `NotificationsSection.tsx`, `usePasskeyLogin.ts` | Auth y fidelidad (cliente) |
| `layout/` | `SiteHeader.tsx` (nav + CTAs; el logo lo pone `HeaderMiniLogo`), `HeaderMiniLogo.tsx` (mini-logo que aparece al bajar, ligado al scroll), `NotificationsBell.tsx` (campana con no leídos), `SiteFooter.tsx`, `MobileMenu.tsx`, `LanguageSwitcher.tsx`, `WhatsAppMenu.tsx`, `ConditionalFloat.tsx`, `ChromeSwitcher.tsx` | Estructura global |
| `home/` | `Hero.tsx` (foto + logo grande `#hero-logo` + CTAs + stats), `HomeTours.tsx` (todas las publicadas + enlace al catálogo), `WhyUs.tsx`, `Testimonials.tsx`, `Gallery.tsx`, `CtaBanner.tsx` | Secciones de la home |
| `tours/` | `TourCard.tsx` (tarjeta catálogo), `TourGallery.tsx`, `TourInfo.tsx`, `TourReviews.tsx` | Tours |
| `booking/` | `BookingForm.tsx` (formulario de reserva tour/traslado/custom), `AvailabilityNote.tsx`, `DepositButton.tsx` | Reservas |
| `transfers/` | `TransferTable.tsx` | Tabla de rutas |
| `contact/` | `ContactForm.tsx` | Formulario de contacto |
| `faq/` | `FaqAccordion.tsx` | Acordeón FAQ |
| `admin/` | `StatusBadge.tsx`, `UploadButton.tsx`, `DeleteButton.tsx` | Piezas del panel |
| `seo/` | `JsonLd.tsx` | Datos estructurados |
| `ui/` | `DatePicker.tsx`, `TimePicker.tsx`, `SectionHeading.tsx`, `Stars.tsx`, `SubmitButton.tsx` | Genéricos |

## 5. Lógica (`src/lib/`)

| Carpeta | Archivos | Uso |
|---|---|---|
| `db/` | `bookings.ts` (crear/leer reservas), `tours.ts`, `content.ts` (traslados, ajustes, testimonios), `availability.ts` (cupo por fecha), `customer.ts`, `promos.ts`, `articles.ts` (blog), `faqs.ts`, `metrics.ts`, `client.ts` (conexión D1/R2) | Acceso a datos (solo servidor) |
| `actions/` | `book-tour.ts` (Server Action: valida → cotiza → guarda → WhatsApp/email), `auth.ts`, `contact-message.ts`, `profile.ts`, `reviews.ts`, `availability.ts` | Server Actions de formularios |
| `admin/` | `bookings.ts`, `tours.ts`, `transfers.ts`, `content.ts`, `promos.ts`, `articles.ts`, `faqs.ts`, `users.ts`, `misc.ts`, `activity.ts`, `texts.ts` (textos del panel), `tour-labels.ts` (etiquetas del editor) | Lógica del panel |
| `auth/` | `session.ts` (JWT + cookie), `dal.ts` (`verifySession`, `getCurrentUser`), `password.ts` (hash) | Sesiones |
| `i18n/` | `config.ts` (idiomas, moneda), `index.ts`, `dictionaries/es.ts`, `dictionaries/en.ts` | **Todos los textos de la web están aquí** |
| `validation/` | `booking.ts` (esquema zod del formulario), `contact.ts`, `auth.ts` | Validación servidor |
| `notify/` | `whatsapp.ts` (enlaces y mensajes), `email.ts` | Avisos |
| `payments/` | `stripe.ts` | Pagos |
| `site.ts` | — | Datos del negocio por defecto (WhatsApp, teléfono, email) |

Otros: `src/proxy.ts` (idioma + protección `/admin`), `src/types/index.ts` (tipos BD).

## 6. Archivos estáticos y SEO

| Ruta | Qué es |
|---|---|
| `public/img/logo.png` | **Logo principal (transparente)** — header, footer, login, signup |
| `public/img/logo.jpg` | Logo con fondo blanco (respaldo) |
| `public/img/*.jpg|webp` | Fotos de tours, hero, galería, about |
| `public/icons/icon-192.png`, `icon-512.png` | Iconos PWA y Apple (`layout.tsx` + `manifest.ts`) |
| `src/app/favicon.ico` | Favicon del navegador |
| `src/app/manifest.ts` | Manifiesto PWA (`/manifest.webmanifest`) |
| `src/app/sitemap.ts`, `robots.ts` | SEO |
| `public/sw.js`, `public/_headers` | Service worker y cabeceras |
| `src/app/fonts/` | Fuentes auto-hospedadas (Poppins, Inter) |

## 7. Base de datos y scripts

| Ruta | Qué es |
|---|---|
| `migrations/0001_init.sql` … `0004_growth.sql` | Esquema D1 (se aplican con `npm run db:migrate:*`) |
| `scripts/seed.mjs` + `seed-data.mjs` | Datos iniciales (tours, traslados, ajustes) |
| `scripts/create-admin.mjs`, `setup-prod-admin.mjs` | Crear administradores |
| `wrangler.jsonc` | Config Cloudflare (D1, R2, despliegue) |

## 8. Flujos clave (de punta a punta)

- **Reservar tour/traslado**: `book/page.tsx` o `tours/[slug]/page.tsx` → `BookingForm.tsx` → Server Action `lib/actions/book-tour.ts` → valida `lib/validation/booking.ts` → `lib/db/bookings.ts` (`quoteBooking` + `createBooking`) → WhatsApp (`lib/notify/whatsapp.ts`) + emails (`lib/notify/email.ts`).
- **Programa de fidelidad** (`lib/db/loyalty.ts`, migración `0007`): cupón 10 % por invitado (registro con `?ref=`), cupón automático cada 2 viajes `completed` (máx. 1 activo por cuenta, contador se reinicia), cupones manuales del admin (`admin/coupons`: crear, enviar correo, cancelar). Los personales se validan por propiedad en la cotización antes que los genéricos (`promo_codes`).
- **Reserva exige cuenta**: sin sesión, el envío abre el modal (`components/auth/ModalLoginForm.tsx`: contraseña JSON `loginJson`, passkey, Google, registro) y guarda el borrador en `sessionStorage` (se restaura al volver, incluso tras Google/signup con `?next=`). El servidor lo garantiza en `bookTour` (`validation.authRequired`).
- **Avisos**: campana del header (`NotificationsBell.tsx` + `GET /api/notifications`) y sección en Mi cuenta. Se generan al confirmar, pagar y emitir cupones (ver `lib/admin/bookings.ts`, webhook Stripe).
- **Ver reserva**: `track/page.tsx` (ref+email) o `account/page.tsx` (sesión) → `lib/db/bookings.ts`.
- **Gestionar reserva**: `admin/bookings/[id]/page.tsx` → `lib/admin/bookings.ts`.
- **Entrar con Google**: botón `components/auth/GoogleButton.tsx` en login/signup → `GET /api/auth/google` → callback (`api/auth/google/callback`) que vincula o crea al usuario (`lib/auth/google.ts`, columna `users.google_id`, migración `0005`). Secretos `GOOGLE_CLIENT_ID/SECRET`. Sin configurar, el botón vuelve al login.
- **Passkeys** (huella/Face ID/PIN): registro en cuenta (`components/auth/PasskeysSection.tsx` + `POST /api/webauthn/register/*`), entrada en login (`LoginForm.tsx` + `POST /api/webauthn/login/*`), tabla `webauthn_credentials` (migración `0006`), lógica en `lib/auth/webauthn.ts`.
- **Recuerda el último usuario** del dispositivo: `localStorage prz-last-email` en `LoginForm.tsx`/`SignupForm.tsx` (pre-rellena el email).
- **Textos visibles**: casi todo está en `lib/i18n/dictionaries/{es,en}.ts` (misma estructura en ambos; si falta una clave en `en.ts`, falla el tipo).
- **Ajustes del negocio** (WhatsApp, email, dirección): tabla `settings` vía `admin/settings/page.tsx`, con fallback en `lib/site.ts`.

## 9. Cambios recientes (referencia rápida)

- Menú móvil con fondo sólido (`MobileMenu.tsx`): el logo fantasma del hero
  ya no se transparenta detrás de los enlaces abiertos.

- Logo nuevo como favicon + principal: `public/img/logo.png` (transparente), iconos en `public/icons/`, favicon `src/app/favicon.ico`, iconos declarados en `src/app/layout.tsx`.
- Home muestra TODAS las excursiones publicadas (`HomeTours.tsx` con
  `listPublishedTours`; título `home.allToursTitle`): lo nuevo que crees
  sale solo marcando "Publicado"; "Orden" controla la posición.
- Header con protagonismo del logo: `src/components/layout/SiteHeader.tsx`. El header arranca sin logo; el grande centrado está en el hero (`Hero.tsx`, `#hero-logo`) y al bajar se encoge y queda fijo arriba (`HeaderMiniLogo.tsx`, reversible con el scroll).
- Etiqueta "Apto para cruceros" eliminada del frontend y del panel (columna `cruise_friendly` en BD quedó sin uso).
- Campo "Nombre de la terminal de cruceros" en reservas: `BookingForm.tsx` + `dictionaries/{es,en}.ts` (`cruisePortLabel/Hint`) + validación `validation/booking.ts` → columna `cruise_port`; visible en admin (`admin/bookings/[id]`), `/track`, CSV y emails.
- Fecha en traslados dice "Fecha del traslado": `dictionaries/{es,en}.ts` (`dateLabelTransfer`), usado en `BookingForm.tsx`.
- Confirmación de reserva animada: check que se dibuja + ondas + entrada
  escalonada + scroll al mensaje (`BookingForm.tsx`, keyframes en
  `globals.css`, respeta `prefers-reduced-motion`).
- Invitados en tours: desplegable 2–11 (`BookingForm.tsx`; traslados siguen
  con número 1–60). Grupos de 12+ coordinan por WhatsApp.
- Login con Google + passkeys + recordar último usuario (ver sección 8).
- Reserva con login obligatorio y borrador persistente (`ModalLoginForm.tsx`, `usePasskeyLogin.ts`, `loginJson`, signup con `?next=`).
- Fidelidad completa: invitados 10 %, recurrentes cada 2 viajes, cupones manuales del admin con envío por correo, campana + sección de avisos (`npm run test:loyalty` 8/8).

## 10. Tests

- Test móvil (`npm run test:mobile -- [url] [carpeta]`): emula un móvil
  real con `scripts/mobile-test.mjs` (Edge headless + `playwright-core`:
  viewport 390x844, táctil, UA móvil). Comprueba 9 puntos: mini-logo
  oculto arriba, hero visible, mini-logo al bajar, hero atenuado, reversa
  al subir, menú hamburguesa con tap real, y cero errores JS. Guarda PNG
  (`01-top`, `02-scrolled`, `03-menu`) + `report.json` en la carpeta dada
  (por defecto un temporal). Requiere el dev corriendo.
- Test de reserva (`npm run test:booking -- [url] [carpeta]`): modal de login
  sin sesión, borrador tras registro, reserva directa, desplegable 2–11 y
  animación (`scripts/test-booking.mjs`). Crea reservas reales (bórralas en
  el panel si quieres).
- Test de auth (`npm run test:auth -- [origen] [carpeta]`): recordar-email,
  Google (fallback o cableado) y ceremonia passkey completa con
  autenticador virtual (`scripts/test-auth.mjs`). Crea UN usuario de prueba.
- Test en producción (`npm run test:prod -- [origen] [login] [cliente]`):
  login real y reserva real (`scripts/test-prod-booking.mjs`). CUIDADO:
  crea datos reales.
- Test de páginas (`npm run test:pages -- [origen] [salida] [--mobile|--desktop]`):
  barrido de TODAS las páginas públicas (es+en) y del panel como admin
  (`scripts/test-pages.mjs`). El contacto crea UN mensaje real.
- Test de fidelidad (`npm run test:loyalty -- [origen] [carpeta]`):
  invitado → cupón → descuento, anti-abuso por propiedad, recurrente cada
  2 viajes, consumo y cupón manual del admin (`scripts/test-loyalty.mjs`).

## 11. Pendientes

- **Resend con dominio propio**: hoy `RESEND_FROM=onboarding@resend.dev`
  solo entrega al correo de la cuenta Resend (`david-dev@suprime.xyz`).
  Verificar el dominio en resend.com → Domains, agregar sus DNS y cambiar
  `RESEND_FROM` a `Perez Tours <reservas@TUDOMINIO>` (secret de producción).
  Envío probado de punta a punta (`email_sent=1`).
