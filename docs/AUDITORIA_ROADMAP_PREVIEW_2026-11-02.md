# Perez Tours — Auditoría y roadmap de preview
Fecha: 2026-11-02. Rama: `fix/preview-imagekit-video-playback`. PR #1.
**Regla:** trabajar solo en preview. No fusionar, modificar D1 de producción, ejecutar migraciones remotas productivas ni desplegar producción sin autorización explícita. No añadir servicios de pago.

## Evidencia verificada
- GitHub Actions #146 (`2259344`): Security audit, Lint + Typecheck y Build aprobaron. El deploy productivo fue omitido.
- `tools-versions.json` es fuente central de dependencias; `scripts/sync-tools.mjs` sincroniza dependencias y overrides. Lockfile usa `glob@14.0.3` y `minimatch@11.0.4`.
- `src/lib/media/imagekit.ts`: máximo 20 ficheros por petición, concurrencia 3, 10 MiB/imagen y 60 MiB/vídeo. Clave privada solo en servidor.
- `src/components/admin/UploadButton.tsx`: actualmente envía todos los archivos seleccionados en **una** petición. No tiene cola 100/20, progreso por lote ni reintentos.
- `src/app/api/admin/upload/route.ts`: protege POST mediante `requireStaffRoles`; GET de límites es público.
- `src/proxy.ts`: verificación JWT preliminar; el DAL comprueba sesión/rol en servidor. `src/lib/auth/session.ts` usa cookie HttpOnly, SameSite=Lax y sesión revocable en D1.
- `.github/workflows/deploy.yml`: antes deploy dependía solo de build. **Corregido en preview**: deploy requiere build **y** security.
- `wrangler.jsonc` apunta a D1 productiva: no usar este archivo para publicar preview sin sustituir correctamente los bindings.
- Token temporal R2 `frosty-truth-debc`: revocación confirmada en auditoría anterior.

## Hallazgos de esta segunda revisión
| Prioridad | Hallazgo | Estado |
|---|---|---|
| P0 | Deploy no dependía de aprobar auditoría de seguridad | Corregido en preview; falta validar CI tras commit |
| P1 | CI usa `npm audit --audit-level=high`: **no falla por moderadas/bajas** | Pendiente: auditoría exhaustiva y política explícita |
| P1 | Carga 100 imágenes en una selección excede máximo servidor 20 | Pendiente |
| P1 | Si un lote sube parcialmente, la respuesta no incluye correlación estable por archivo; emparejar URL por índice puede asociar nombres incorrectos | Pendiente |
| P1 | En `imagekit.ts`, una URL devuelta fuera del endpoint configurado solo se registra, no se rechaza | Pendiente: validar host/ruta HTTPS sin bloquear endpoints legítimos |
| P1 | `imagekit.ts` registra parte de la respuesta externa en errores: revisar redacción de datos sensibles y límites de logs | Pendiente |
| P1 | No hay evidencia en esta auditoría de pruebas E2E de auth, galería, reservas, vídeos ni D1 | Pendiente |
| P2 | Protección CSRF, rate limits, validación real de contenido y cuotas de subida: requieren revisión sistemática de handlers y acciones | Por auditar, **no** se afirma vulnerabilidad |
| P2 | GitHub Actions usa referencias `actions/checkout@v4` y `actions/setup-node@v4` sin SHA/lockfile | Endurecimiento recomendado |
| P2 | `src/proxy.ts` redirige host canónico; SEO robots presente, revisar sitemap, hreflang, metadatos y URLs canónicas | Pendiente |
| P2 | Grupos de galería usan `group_name`/caption fallback; verificar integridad, filtrado y edición | Pendiente |

## Roadmap acordado y estado
### Fase 0 — Contención y diagnóstico (hecho / parcial)
- [x] Conectar GitHub y Cloudflare de Carlos; distinguir preview de producción.
- [x] Revocar únicamente el token temporal R2 identificado.
- [x] Identificar historial del error HTTP 500 tras incorporar vídeos (`accb273`, `688156c`, `ae71e05`); confirmar tabla/migración `gallery_videos` en revisión previa.
- [ ] Reproducir y demostrar resolución del HTTP 500 en portada y galería con pruebas reales.

### Fase 1 — Dependencias y CI (hecho / validación adicional)
- [x] Catálogo único `tools-versions.json`, sincronizador y lockfile.
- [x] Actualizar Next.js/Zod y resolver avisos previos de `glob` y `minimatch`.
- [x] GitHub Actions #146: auditoría al umbral HIGH, lint, typecheck y build aprobados.
- [x] Exigir auditoría de seguridad antes de deploy (nuevo cambio en preview).
- [ ] Confirmar nuevo CI y ejecutar auditoría al umbral LOW, separando hallazgos reales de falsos positivos.
- [ ] Revisar seguridad de GitHub Actions, permisos mínimos y dependencia de acciones externas.

### Fase 2 — Galería masiva (pendiente)
- [ ] Selección de hasta **100 imágenes** por operación; enviar automáticamente lotes de **20**, concurrencia controlada de 3 en servidor.
- [ ] Barra de progreso real, cancelación razonable, reintentos con backoff y resumen de fallos.
- [ ] Idempotencia/deduplicación al reintentar; correlación correcta nombre ↔ URL, incluso si hay fallos parciales.
- [ ] Persistencia segura en D1 preview, sin duplicados, conservando grupo/categoría y metadatos.
- [ ] Pruebas 1/20/21/100 imágenes, fallos de red, cuota ImageKit y permisos de fotógrafo/editor.

### Fase 3 — Vídeos ImageKit (pendiente de verificación funcional)
- [ ] Reproducir vídeos públicos en portada y galería, con miniatura, controles táctiles y fallback.
- [ ] Validar `media-src`, MIME, HTTPS, cabeceras, accesibilidad y políticas de carga.
- [ ] Adaptación a redes lentas y cruceros: poster/preload limitado, MP4 fallback y HLS/DASH **solo si ImageKit lo soporta en plan actual sin coste extra**.
- [ ] Aislar fallos de consulta de vídeos para que no derriben portada/galería (HTTP 500).
- [ ] Verificar en móvil, escritorio y preview desplegado.

### Fase 4 — Seguridad y funcionamiento global (pendiente)
- [ ] Auditar rutas API, Server Actions, roles, autorización por recurso, CSRF, rate limiting, XSS, SQL, redirecciones, logs y secretos.
- [ ] Comprobar D1/migraciones de preview y reversibilidad; no tocar D1 productiva.
- [ ] Revisar reservas, tours, traslados, pagos, contacto, correo, usuarios y panel con pruebas E2E.
- [ ] Revisión SEO, robots/sitemap, rendimiento, imágenes, Core Web Vitals y accesibilidad.
- [ ] Monitorear errores y verificar flujos con datos de prueba, sin cambios destructivos.

### Fase 5 — Diseño del panel administrativo (ÚLTIMA)
- [ ] Rediseñar menú y experiencia del admin **solo después** de estabilizar funcionalidad y seguridad.
- [ ] Mantener roles, accesibilidad, móvil y operaciones existentes.

### Fase 6 — Entrega controlada
- [ ] Documentar pruebas y pendientes, verificar PR #1 sin conflictos, preparar rollback.
- [ ] Pedir aprobación explícita del usuario **antes** de merge/deploy/migraciones productivas.
- [ ] Tras aprobación, despliegue controlado y smoke test de producción.

## Criterios de cierre
No declarar «sin vulnerabilidades» solo por `npm audit --audit-level=high`: esa política no bloquea hallazgos moderados/bajos y no cubre vulnerabilidades de lógica de aplicación. Documentar evidencia de CI, pruebas funcionales y riesgos residuales antes de solicitar paso a producción.
