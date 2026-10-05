# Mapa de rutas y archivos — prz-web

> Para qué sirve: cuando pidan cambiar algo, busca aquí la URL o la
> funcionalidad y ve directo al archivo. Rutas relativas a `prz-web/`.

Convenciones: todo lo público vive bajo `src/app/[lang]/` (`/es`, `/en`).
El idioma lo inyecta el proxy (`src/proxy.ts`) vía cabecera `x-locale`.

---

## 0. Dominio, correo e infraestructura

| Qué | Dónde | Detalle |
|---|---|---|
| Dominio en producción | `wrangler.jsonc` → `routes` | `perez-tours.com` y `www.perez-tours.com` como `custom_domain` (Cloudflare crea DNS y SSL solo). `*.workers.dev` sigue vivo como red de seguridad |
| Redirección canónica | `src/proxy.ts` → `HOST_REDIRECTS` | `www.perez-tours.com` → `perez-tours.com` con 301, conservando ruta y query. Se hace en el Worker porque el API de Page Rules de Cloudflare rechaza los tokens de cuenta |
| Envío de correo | Resend | Dominio `perez-tours.com` **verificado**. Remitente único en `RESEND_FROM` = `Perez Tours & Transfers <reservas@perez-tours.com>` (secreto de Cloudflare **y** `.dev.vars`, mismo formato en los dos sitios; `scripts/sync-dev-vars.mjs` los mantiene iguales) |
| Buzón del dominio | Spacemail (Spaceship) | `asistencia@perez-tours.com`. DNS en Cloudflare: `MX @ → mx1/mx2.spacemail.com` (prio 10) y `TXT @ → v=spf1 include:spacemail.com ~all`. IMAP `mail.spacemail.com:993`, SMTP `smtp.spacemail.com:465` |
| Reparto interno | ajuste `notify_emails` | Lista separada por comas de a quién avisa la web (reservas nuevas, pagos, contacto). Se lee en `getInternalRecipients()` (`lib/notify/email.ts`) y se edita en `/admin/settings`, sin desplegar |
| Copia de todo correo | `sendEmail()` en `lib/notify/email.ts` | Todo lo que sale de la web (reservas, cancelaciones, cambios de estado, pagos, cupones) se copia **en BCC** a `notify_emails`. El aviso interno al negocio va con `copyToInternal: false` para no duplicarse |
| Correo de cambios de estado | `sendBookingUpdateEmail()` en `lib/notify/booking-email.ts` | Al confirmar, cancelar o registrar un pago se manda correo al cliente con el resumen de la reserva. La copia interna la añade `sendEmail` sola. Nunca lanza: si Resend falla, el cambio de estado ya está guardado |
| Registros DNS de Resend | `send`, `rsend` y `resend._domainkey` | `MX send → feedback-smtp.us-east-1.amazonses.com`, `TXT send → v=spf1 include:amazonses.com ~all`, `CNAME rsend → send.forge.rmta.net`, `TXT resend._domainkey → p=MIGf…`. Ojo: el CNAME va en **`rsend`**, no en `send` (en `send` chocaría con el MX y el TXT) |
| Pruebas de correo | `npm run test:email` | Envía un correo real al buzón del dominio y al Gmail del cliente, e informa del estado de cada envío |
| R2 (fotos del panel) | `wrangler.jsonc` (bloque comentado) | **Sigue deshabilitado:** la cuenta está en plan `free` sin R2 activado. Hay que habilitarlo en el panel y añadir un método de pago |

**Spacemail no sustituye a Resend.** La API pública de Spaceship solo cubre dominios, DNS y SellerHub; no tiene buzón ni envío programático. Spacemail = buzón humano (IMAP/SMTP). Resend = correos automáticos a clientes. Conviven porque los registros DNS no se pisan: `MX`/`TXT` de la raíz para Spacemail, subdominio `send` para Resend.

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
| `migrations/0008_photographer_role.sql` | Rol `photographer` en el CHECK de `users.role` |
| `migrations/0009_tour_categories.sql` | Tabla `tour_categories` (categorías de tour dinámicas) + reconstruye `tours`. **Ojo:** replica TODAS las columnas de 0001+0004 (`max_group`, `cruise_friendly`, `deposit_percent`); si algún día se añade una columna a `tours`, hay que añadirla también aquí |
| `migrations/0010_push_subscriptions.sql` | `push_subscriptions` + `push_prompts` (PWA instalable y push) |
| `scripts/reset.sql` + `db:reset:local` | Vacía la D1 local y reaplica 0001→0010 (incluye `d1_migrations`) |
| `scripts/seed.mjs` + `seed-data.mjs` | Datos iniciales (tours, traslados, ajustes) |
| `scripts/create-admin.mjs`, `setup-prod-admin.mjs` | Crear administradores |
| `scripts/gen-vapid.mjs` | Genera el par de claves VAPID del push en `.vapid.local` |
| `scripts/test-*.mjs`, `mobile-test.mjs` | Pruebas reutilizables (`npm run test:*`) |
| `wrangler.jsonc` | Config Cloudflare (D1, R2, despliegue) |

## 8. Flujos clave (de punta a punta)

- **Reservar tour/traslado**: `book/page.tsx` o `tours/[slug]/page.tsx` → `BookingForm.tsx` → Server Action `lib/actions/book-tour.ts` → valida `lib/validation/booking.ts` → `lib/db/bookings.ts` (`quoteBooking` + `createBooking`) → WhatsApp (`lib/notify/whatsapp.ts`) + emails (`lib/notify/email.ts`).
- **Programa de fidelidad** (`lib/db/loyalty.ts`, migración `0007`): cupón 10 % por invitado (registro con `?ref=`), cupón automático cada 2 viajes `completed` (máx. 1 activo por cuenta, contador se reinicia), cupones manuales del admin (`admin/coupons`: crear, enviar correo, cancelar). Los personales se validan por propiedad en la cotización antes que los genéricos (`promo_codes`).
- **Reserva exige cuenta**: sin sesión, el envío abre el modal (`components/auth/ModalLoginForm.tsx`: contraseña JSON `loginJson`, passkey, Google, registro) y guarda el borrador en `sessionStorage` (se restaura al volver, incluso tras Google/signup con `?next=`). El servidor lo garantiza en `bookTour` (`validation.authRequired`).
- **Avisos**: campana del header (`NotificationsBell.tsx` + `GET /api/notifications`) y sección en Mi cuenta. Se generan al confirmar, pagar y emitir cupones (ver `lib/admin/bookings.ts`, webhook Stripe).
- **Ver reserva**: `track/page.tsx` (ref+email) o `account/page.tsx` (sesión) → `lib/db/bookings.ts`.
- **Gestionar reserva**: `admin/bookings/[id]/page.tsx` → `lib/admin/bookings.ts`.
- **Entrar con Google**: botón `components/auth/GoogleButton.tsx` en login/signup → `GET /api/auth/google` → callback (`api/auth/google/callback`) que vincula o crea al usuario (`lib/auth/google.ts`, columna `users.google_id`, migración `0005`). Secretos `GOOGLE_CLIENT_ID/SECRET`. Sin configurar, el botón vuelve al login.
- **Passkeys** (huella/Face ID/PIN): registro en cuenta (`components/auth/PasskeysSection.tsx` + `POST /api/webauthn/register/*`), entrada en login (`LoginForm.tsx` + `POST /api/webauthn/login/*`) con email o **descubrible sin email** (el dispositivo elige la cuenta vía `userHandle`), tabla `webauthn_credentials` (migración `0006`), lógica en `lib/auth/webauthn.ts`.
- **Recuerda el último usuario** del dispositivo: `localStorage prz-last-email` en `LoginForm.tsx`/`SignupForm.tsx`/`ModalLoginForm.tsx` (contraseña, passkey y Google del modal pre-rellenan el login).
- **Roles del panel** (`lib/admin/access.ts` + migración `0008`): `admin` (todo), `editor` (opera y edita contenido no sensible), `photographer` (solo galería), `customer` (sin panel). Super-admin `dev@suprime.xyz` intocable. Guards en dos capas: páginas (`requireSection`) y Server Actions (`requireStaffRoles`).
- **WhatsApp confirma con tus reservas**: el menú flotante (`WhatsAppMenu.tsx` + `GET /api/bookings/mine`) lista tus pendientes para elegir y autorrellena la referencia; con una sola la pone directa.
- **Textos visibles**: casi todo está en `lib/i18n/dictionaries/{es,en}.ts` (misma estructura en ambos; si falta una clave en `en.ts`, falla el tipo).
- **Ajustes del negocio** (WhatsApp, email, dirección): tabla `settings` vía `admin/settings/page.tsx`, con fallback en `lib/site.ts`.
- **Auto-traducción ES→EN**: `lib/admin/translate.ts` (`translateEsToEn` vía MyMemory, gratis y sin API key). `autoTranslateTour(formData)` rellena **solo los campos de inglés que estén vacíos** (si el admin ya escribió inglés, se respeta). Se llama en `createTour`/`updateTour` antes de `writeTour`, y al crear una categoría. Si la API falla, el guardado continúa con el inglés vacío.
- **Categorías de tour dinámicas** (migración `0009`): `lib/admin/categories.ts` (crear/activar/eliminar) + pantalla `admin/tours/categories/`. El selector del formulario se llena con `listTourCategories`; el catálogo público usa `listActiveCategories` (`lib/db/tours.ts`) y solo muestra como filtro las que tienen tours publicados. Al borrar una categoría sus tours pasan a `other`; desactivarla no toca los tours. `parseBase` valida el slug contra la tabla (`normalizeCategory`), no contra una lista fija.
- **PWA instalable + notificaciones push** (migración `0010`): `components/pwa/PwaInstallPrompt.tsx` captura `beforeinstallprompt`, pide permiso, se suscribe y guarda la suscripción en `POST /api/push/subscribe`. Clave VAPID en `GET /api/push/public-key` (503 si no está configurada); secretos `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (ver `scripts/gen-vapid.mjs`). Envío con `web-push` en `lib/db/push.ts`; se dispara desde `notifyUser` (`lib/db/loyalty.ts`), así que **toda** notificación de la web llega también al móvil. `sw.js` atiende `push`, `notificationclick` y `message`.
  - Ojo: el aviso va **arriba a la izquierda** (`top-20`), nunca abajo, porque abajo a la derecha vive el menú flotante de WhatsApp y solaparse le bloqueaba los clics.
  - `useSyncExternalStore` para `isStandalone()`/`isIos()`/`PushManager`: el servidor renderiza vacío y tras hidratar aparece, para no romper la hidratación.
  - Sin claves VAPID el sitio funciona igual (solo se pierde el push al móvil).
- **Entrar con Google**: la URI de redirección autorizada en Google Cloud debe ser exactamente `https://<host>/api/auth/google/callback`. Si no coincide, Google responde `redirect_uri_mismatch`.
  Con el dominio propio hay que añadir **tres URIs** (una por host; la de `workers.dev` se puede quitar cuando Google la acepte):
  - `https://perez-tours.com/api/auth/google/callback`
  - `https://www.perez-tours.com/api/auth/google/callback`
  - `https://prz-tours.carlosprz-tours.workers.dev/api/auth/google/callback`

  Y en *Orígenes JS autorizados*: `https://perez-tours.com`, `https://www.perez-tours.com` y el `workers.dev`.

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
- Panel responsive: regla anti-overflow — `grid` solo nunca lleva columna
  implícita con contenido largo (`truncate`/nowrap la estira); usar
  `grid-cols-1` (pista `minmax(0,1fr)`), `min-w-0` en items,
  `break-words/break-all` en textos largos y `overflow-x-auto` en tablas.
  Vigilado por `test:pages` (`sin overflow` en cada página del panel).
- Móvil real, no el de laboratorio: el alto útil de un móvil de verdad es de
  ~660-730px (barra de direcciones + barra de navegación), no los 844px que
  usan los emuladores. Por eso el hero se compacta con
  `[@media(max-height:760px)]` (logo y titular más pequeños, estadísticas
  ocultas) y a 320px de ancho se oculta el segundo CTA.
  Ojo: `max-[380px]` en Tailwind es de **ancho**; para **alto** hay que
  escribir la media query entera: `[@media(max-height:760px)]:`.
  Vigilado por `node scripts/probe-android-overlap.mjs` (comprueba que el
  botón de WhatsApp no tape nada pulsable en Pixel 5, Galaxy S9 e iPhone 13).
- **Comentarios en JSX**: van entre llaves y asteriscos. Con dos barras (`//`)
  se **pintan en la web** (pasó aquí: un bloque de texto gris encima del hero).
  Y dentro de un comentario `{...}` no se pueden volver a escribir llaves de
  comentario anidadas.
- **Envío de correos**: hay que **esperar** (`await`) a `sendEmail`. Si se
  lanza en segundo plano, Cloudflare Workers cancela la promesa al terminar la
  Server Action y el correo se pierde (pasó: 13/13 reservas de producción con
  `email_sent=0`).
- Referencias cliqueables: recuadro mono con anillo en dashboard recientes,
  lista y tabla de reservas.
- Imágenes protegidas contra descarga casual (menú contextual y arrastre): CSS en `globals.css` + `components/ui/ImageGuard.tsx` montado en el layout raíz.
- Hero centrado (logo, etiqueta, título, CTAs) y menú móvil que se cierra solo al deslizar (`MobileMenu.tsx`).

## 10. Tests

- Test móvil (`npm run test:mobile -- [url] [carpeta]`): emula un móvil
  real con `scripts/mobile-test.mjs` (Edge headless + `playwright-core`:
  viewport 390x844, táctil, UA móvil). Comprueba 9 puntos: mini-logo
  oculto arriba, hero visible, mini-logo al bajar, hero atenuado, reversa
  al subir, menú hamburguesa con tap real, y cero errores JS. Guarda PNG
  (`01-top`, `02-scrolled`, `03-menu`) + `report.json` en la carpeta dada
  (por defecto un temporal). Requiere el dev corriendo.
- Test de reserva (`npm run test:booking -- [url] [carpeta] [correo-real]`): modal
  de login sin sesión, borrador tras registro, reserva directa, desplegable 2–11
  y animación (`scripts/test-booking.mjs`). Crea reservas reales (bórralas en
  el panel si quieres). El 4º argumento es **opcional**: sin él usa
  `example.com`, que Resend rechaza a propósito, así que la batería no genera
  correo. Con una dirección real cada fase usa una etiqueta distinta
  (`+1`, `+2`) y llega todo al mismo buzón.
- Test de auth (`npm run test:auth -- [origen] [carpeta]`): recordar-email,
  Google (fallback o cableado) y ceremonia passkey completa con
  autenticador virtual (`scripts/test-auth.mjs`). Crea UN usuario de prueba.
- Test en producción (`npm run test:prod -- [origen] [login] [cliente]`):
  login real y reserva real (`scripts/test-prod-booking.mjs`). CUIDADO:
  crea datos reales.
- Test de páginas (`npm run test:pages -- [origen] [salida] [--mobile|--desktop]`):
  barrido de TODAS las páginas públicas (es+en) y del panel como admin
  (`scripts/test-pages.mjs`). El contacto crea UN mensaje real.
- Test de fidelidad (`npm run test:loyalty -- [origen] [carpeta] [correo-real]`):
  invitado → cupón → descuento, anti-abuso por propiedad, recurrente cada
  2 viajes, consumo y cupón manual del admin (`scripts/test-loyalty.mjs`).
  Es el que confirma reservas, así que es el que dispara el correo de
  «Reserva confirmada». El 3er argumento es opcional y funciona como en
  `test:booking` (etiquetas `+a` y `+b`).
- Test de categorías + push (`npm run test:categories -- [origen] [carpeta]`):
  crea una categoría solo en español y verifica la auto-traducción, el slug,
  que aparezca en el formulario, el aviso de duplicado, que desactivar no
  borra los tours, la clave VAPID, el 401 sin sesión y que el cliente ve el
  aviso de instalar la PWA (`scripts/test-categories.mjs`).

## 11. Pendientes

- ~~**Resend con dominio propio**~~ — **hecho.** Dominio `perez-tours.com`
  verificado, `RESEND_FROM=Perez Tours & Transfers <reservas@perez-tours.com>`
  y envío probado de punta a punta (`npm run test:email` y una reserva real).
- **R2 (imágenes del panel)**: sigue pendiente. La cuenta está en plan `free`
  sin R2, y la API devuelve 403 al pedir el bucket. Pasos: dashboard →
  R2 → *Enable* (hace falta un método de pago) → `wrangler r2 bucket create
  prz-media` → descomentar el bloque de `wrangler.jsonc` → desplegar. Sin
  esto, la subida de fotos del panel no funciona.
- **DKIM de Spacemail**: solo hay SPF. Para mejorar la entrega del buzón,
  añadir el registro DKIM que muestra Spacemail Manager (suele ser un CNAME
  en `<selector>._domainkey`). No es imprescindible.
- **Google OAuth**: añadir la URI y los orígenes del dominio propio (ver
  `## 8`), o el botón «Continuar con Google» seguirá fallando con
  `redirect_uri_mismatch`.
- **ImageKit**: falta la Private Key y el URL Endpoint para subir fotos desde
  el móvil y el PC.
