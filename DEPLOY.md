# Despliegue a Cloudflare (con GitHub)

Esta guía lleva el proyecto desde local hasta producción con dominio propio.
Tiempo estimado: 20–30 minutos la primera vez.

Arquitectura en producción:

```
GitHub (push a main)
   │  GitHub Actions: lint + typecheck + contenido + build
   ▼
Cloudflare Workers (Next.js vía OpenNext)
   ├── D1 `prz-tours` …… base de datos (contenido + reservas + usuarios)
   ├── R2 `prz-media` …… imágenes subidas desde el panel
   └── Secrets …………… AUTH_SECRET, RESEND_API_TOKEN, etc.
```

---

## 1. Subir el código a GitHub

```bash
cd prz-web
git init                    # si no es repo todavía
git add -A
git commit -m "Perez Tours: sitio + panel de administración"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/prz-tours.git
git push -u origin main
```

> `.gitignore` ya excluye `node_modules`, `.dev.vars`, `.open-next`,
> `.wrangler` y las BD locales. **Nunca subas `.dev.vars`.**

---

## 2. Crear la base de datos D1

En tu máquina (con `wrangler` ya instalado por el proyecto):

```bash
npx wrangler login
npm run db:create
```

Copia el `database_id` que imprime y pégalo en `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "prz-tours",
    "database_id": "PEGA-AQUI-TU-ID",
    "migrations_dir": "migrations"
  }
]
```

Haz commit de ese cambio y push (el ID no es secreto).

---

## 3. Crear el bucket R2 (imágenes del panel)

```bash
npx wrangler r2 bucket create prz-media
```

El binding `MEDIA` ya está declarado en `wrangler.jsonc`.

---

## 4. Migraciones + contenido inicial (remoto)

```bash
npm run db:migrate:remote   # crea las 14 tablas
npm run db:seed:remote      # 7 tours ES/EN, traslados, opiniones, galería, ajustes
```

---

## 5. Crear el administrador (remoto)

```bash
# Te pide email, nombre y contraseña:
npm run create-admin -- --remote
```

Guarda esas credenciales en un lugar seguro. Desde ese usuario podrás
crear más staff en `/en/admin/users`.

---

## 6. Secretos de producción

```bash
# Secreto de sesiones (genera uno nuevo, NO reutilices el de local):
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
npx wrangler secret put AUTH_SECRET
```

Opcional (emails con Resend; sin esto las reservas funcionan igual pero no
se envían correos):

1. Crea cuenta en https://resend.com y verifica tu dominio.
2. Crea una API key.
3. ```bash
   npx wrangler secret put RESEND_API_TOKEN
   npx wrangler secret put RESEND_FROM      # p. ej. "Perez Tours <hola@tudominio.com>"
   npx wrangler secret put NOTIFY_EMAIL     # tu correo para avisos de reservas
   ```

Lista de secretos necesarios:

| Secreto            | Obligatorio | Para qué                              |
| ------------------ | ----------- | ------------------------------------- |
| `AUTH_SECRET`      | Sí          | Firmar las sesiones (mín. 32 car.)    |
| `RESEND_API_TOKEN` | No          | Enviar correos de confirmación        |
| `RESEND_FROM`      | No          | Remitente de los correos              |
| `NOTIFY_EMAIL`     | No          | Recibir avisos de reservas y contacto |

---

## 7. Deploy automático con GitHub Actions

El workflow `.github/workflows/deploy.yml` hace en cada push a `main`:
`lint + typecheck + check-content → build → migraciones D1 → deploy`.

Necesita dos secretos en GitHub
(Settings → Secrets and variables → Actions):

| Secreto                | Dónde sale                                              |
| ---------------------- | ------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` | Panel Cloudflare → My Profile → API Tokens → **Edit Cloudflare Workers** (permiso Workers + D1 + R2) |
| `CLOUDFLARE_ACCOUNT_ID`| Panel Cloudflare → Workers → Overview (columna derecha) |

Tras configurarlos, cada `git push` a `main` despliega solo. Los PR solo
verifican y compilan, no despliegan.

### Deploy manual (alternativa)

```bash
npm run deploy
```

---

## 8. Dominio personalizado

1. En el panel de Cloudflare: Workers & Pages → tu Worker `prz-tours` →
   Settings → Domains & Routes → **Add Custom Domain**.
2. Escribe tu dominio (p. ej. `pereztours.cloud`).
3. Si el dominio ya está en Cloudflare, el DNS se crea solo. Si no:
   apunta tu DNS al Worker según las instrucciones del panel.
4. Actualiza `metadataBase` en `src/app/layout.tsx` y `BASE` en
   `src/app/sitemap.ts` / `robots.ts` si cambias de dominio.

---

## 9. Comprobación post-deploy

1. Abre `https://tudominio.com/en` → home con los 7 tours.
2. Haz una reserva de prueba → debe aparecer en `/en/admin/bookings`.
3. Entra a `/en/login` con tu admin → dashboard con métricas.
4. Sube una foto en `/en/admin/gallery` → debe verse en la home.
5. Borra la reserva de prueba desde el panel.

---

## Comandos útiles

| Comando                    | Qué hace                              |
| -------------------------- | ------------------------------------- |
| `npm run dev`              | Desarrollo local (D1 + R2 emulados)   |
| `npm run build`            | Compila para producción (verificación) |
| `npm run preview`          | Build OpenNext + prueba en runtime Workers local |
| `npm run deploy`           | Build + publica en Cloudflare         |
| `npm run db:migrate:local` | Aplica migraciones a la BD local      |
| `npm run db:seed:local`    | Recarga el contenido demo en local    |
| `npm run db:reset:local`   | Vacía la BD local (desarrollo)        |
| `npm run create-admin`     | Crea/actualiza un admin (`--remote` para producción) |
| `node scripts/check-content.mjs` | Valida que no haya texto corrupto |
| `node scripts/dev-session.mjs`   | Cookie de admin para probar con curl (solo local) |

## Notas

- `scripts/seed-test-bookings.mjs` inserta reservas falsas: úsalo solo en
  local para probar el panel.
- El plan gratuito de Cloudflare cubre D1 (5 GB), R2 (10 GB) y Workers
  (100k req/día): de sobra para este sitio.
- `wrangler.jsonc` ya lleva el `database_id` de producción.
- **Dos identidades de Cloudflare**: si tu máquina tiene un login oauth
  (`wrangler login`) de OTRA cuenta, los comandos remotos deben pasar
  SIEMPRE por `node scripts/with-secrets.mjs -- ...`, que inyecta el token
  y el account ID juntos. Mezclar token de una cuenta con el login de otra
  produce `Authentication error [code: 10000]`.
- **El build nunca depende de la BD**: las páginas se renderizan bajo
  demanda desde D1, así lo que edites en el panel se refleja al instante
  sin reconstruir. Por eso `generateStaticParams` tiene fallback vacío y el
  sitemap es `force-dynamic`.
