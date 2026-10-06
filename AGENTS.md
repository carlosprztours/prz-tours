<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas de pruebas (puestas por el cliente)

## NUNCA ejecutar la batería completa sin que la pidan

El cliente complained de que cada cambio mandaba reservas de prueba a la web y
le llenaba el panel de basura. **No se lanzan `test:booking`, `test:prod`,
`test:loyalty`, `test:auth`, `test:categories` ni `test:pages` por rutina.**

Qué hacer en su lugar:

- Se prueba **solo lo que se ha tocado**, con una comprobación corta y
  dirigida (un script puntual o una mirada a la página affected).
- La batería completa (`test:pages`, `test:mobile`, `test:booking`, …) **solo
  si la pide expresamente**.
- Si un cambio toca algo de riesgo (correos, reservas, panel), se avisa de que
  va a hacer falta la prueba correspondiente y se espera a que la pida.

La razón no es el ruido: es que estas pruebas crean datos reales en producción
y mandan correos de verdad.

## Pruebas que sí se pueden lanzar por rutina

Son de solo lectura o se limpian solas:

- `npm run test:gallery` — no crea nada.
- `npm run test:gallery:admin` — sube 3 fotos, edita una y borra sus 3 filas y
  sus 3 ficheros de ImageKit. No toca reservas ni manda correos.
- `npm run test:imagekit` — sube un PNG y lo borra.
- `npm run test:upload` — sube una foto y la borra (panel y ImageKit).
- `node scripts/probe-android-overlap.mjs <url>` — solo mira el diseño.
- `npm run typecheck`, `npm run lint`, `npm run check-content`.

Aunque lo limpien, menciónalo al informar del cambio.
