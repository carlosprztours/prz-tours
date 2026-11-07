# Bloque 7 · Arquitectura y guía de adaptación

Referencia técnica de Perez Tours tras el PR #11, commit `cb2054fc36cf3a547447f522fd0fccda762827b6`. D1 de producción verificada hasta `0022`. La guía sirve para evaluar adopciones por módulo en otros proyectos.

## Arquitectura

Next.js App Router organiza las páginas bajo `src/app/[lang]` y los handlers bajo `src/app/api`. La UI usa React y Tailwind. OpenNext empaqueta la aplicación para Cloudflare Workers. `editorial-worker.ts` conecta el cron editorial con la aplicación. El acceso a D1 pasa por `src/lib/db/client.ts` y los módulos de cada dominio. La publicación del código se coordina en GitHub Actions. La instalación usa Node 22, npm y el archivo de bloqueo del repositorio.

| Módulo reutilizable | Piezas de origen y requisitos | Adaptación para otro cliente |
|---|---|---|
| Catálogo, traslados, páginas y SEO | `src/app/[lang]`, `src/lib/db/tours.ts`, `src/lib/db/content.ts`, `src/lib/i18n`. D1, diccionarios ES/EN y componentes de sitio. | Identidad visual, idiomas, rutas y redirecciones históricas, categorías, moneda, contenidos y metadatos. |
| Edición y traducción | `src/lib/admin`, `src/lib/db/editorial-cache.ts`, `editorial-worker.ts`, migraciones `0016–0018`. Workers AI opcional según configuración. | Revisar idiomas, presupuesto, publicación, protección de contenido manual y recuperación por módulo. |
| Galería y carga multimedia | `src/components/gallery`, `src/components/media`, `src/lib/media`, `src/app/api/admin/upload`. ImageKit para cargas, almacenamiento y CDN. | Usar recursos y límites del cliente. Revisar marca, procedencia de medios, formatos y texto alternativo. |
| Cuenta, autenticación y permisos | `src/lib/auth`, `src/lib/admin/access.ts`, `src/lib/admin/roles.ts`, `src/app/[lang]/account`. D1 y secreto de sesión. OAuth y passkeys opcionales. | Definir el administrador principal propio, revisar origen y cookies, proveer credenciales OAuth y configurar el RP de WebAuthn para el dominio. |
| Reservas y pagos | `src/components/booking`, `src/lib/db/bookings.ts`, `src/lib/payments`, `src/app/api/paypal` y `src/app/api/stripe`. Reglas de cotización, D1 y adaptadores separados. | Validar precios, unidades, depósitos, estado comercial, proveedor, moneda y rutas de retorno. |
| Fidelidad y pasaporte | `src/lib/db/loyalty.ts`, `src/components/auth/LoyaltyPassport.tsx`, migración `0007`. Sesión, reservas, cupones y avisos. | Aprobar umbral, descuento, caducidad y reglas de consumo. En Perez Tours, el QR y el cierre del servicio no acreditan el viaje. |
| Conductores, asignaciones y QR | Migración `0019` y rutas administrativas de conductores, servicios, asignaciones y QR. D1, permisos por asignación e historial. | Validar turnos, datos mínimos de recogida, formato QR y separación entre operación y estado comercial. |
| Archivo e informes | Migración `0022`, `src/lib/db/booking-reporting.ts`, rutas de reservas y finanzas. Archivo reversible, auditoría y cantidades por moneda. | Definir quién puede excluir, reglas de conciliación y protección propia de registros. Revisar referencias y guardas específicas antes de portar código. |
| PWA, correo y avisos | `public/sw.js`, `src/app/manifest.ts`, `src/lib/db/push.ts`, `src/lib/notify`. VAPID, Resend y ajustes por cliente. | Nombre e iconos, alcance del service worker, remitente, destinos, claves por entorno y consentimiento de avisos. |
| Releases y despliegue | `.github/workflows/deploy.yml`, `wrangler.jsonc`, `scripts/release.mjs` y [guía de releases](RELEASES.md). | Adaptar permisos de Actions, entorno protegido, nombres de Worker, rutas, bindings y política de aprobación. |

## Migraciones y configuración

| Grupo | Contenido | Validación |
|---|---|---|
| `0001–0009` | Esquema base, cuentas, OAuth, passkeys, fidelidad, roles y categorías. | Ejecutar el historial en base vacía y comprobar claves foráneas. En un cliente existente, mapear cada tabla y reconciliar el historial antes de aplicar cambios. |
| `0010–0015` | Push, vídeos, reservas PayPal temporales, notificaciones, cruceros y portada. | Revisar roles, formatos de fechas y estados de pago, relaciones y persistencia de eventos. |
| `0016–0019` | Caché y revisión editorial, recuperación, conductores y QR. | Probar recuperación y publicación, protección de traducciones manuales, asignación y revocación. |
| `0020–0021` | Correcciones de texto a registros concretos de Perez Tours. | Tratar como datos del cliente. Preparar correcciones propias si hicieran falta. |
| `0022` | Campos aditivos de archivo y exclusión, índice y auditoría. | Probar con registros heredados, verificar restauración y confirmar que archivar no cambia cobros, reembolsos ni estados. |

Usar un Worker y una D1 distintos por cliente y entorno, con sus propios nombres, identificadores, dominios y valores para `WORKER_SELF_REFERENCE`. Mantener los mismos nombres lógicos de bindings si el código los requiere. Preparar `DB`, `ASSETS`, y de forma opcional `AI` e `IMAGES`, de acuerdo con el alcance. Definir la configuración local con `.dev.vars.example` y variables sintéticas, y gestionar valores reales en el almacén del entorno.

- Generar un `AUTH_SECRET` diferente por cliente y entorno. Separar tokens de CI de las credenciales del runtime y limitar sus permisos a los recursos que publica cada proyecto.
- Configurar ImageKit, Resend, OAuth y VAPID con recursos del cliente. Validar callback, remitente, dominio, origen y claves antes de activar. Revisar la privacidad de avisos y limitar los destinos push a proveedores permitidos.
- Habilitar PayPal o Stripe solo si corresponde. Validar moneda, entorno, webhook, retornos e idempotencia. Mantener deshabilitados los efectos externos de reservas en pruebas con `DISABLE_EXTERNAL_BOOKING_EFFECTS=true`. Las suites históricas que pueden enviar mensajes o usar producción se reservan para autorización específica.
- Conservar datos personales, pagos, sesiones, cupones, secretos y medios de cada negocio en sus propios recursos. Las pruebas reutilizables llevan datos sintéticos. Las copias de recuperación pertenecen a su entorno y se conservan con acceso restringido.
- Mantener un cron por entorno con credenciales propias y límites del modelo. Dejar efectos externos y traducción desactivados en pruebas salvo cuando se verifique una integración concreta.

## Roles y límites operativos

| Rol | Alcance en Perez Tours |
|---|---|
| Administrador principal | Administración, configuración sensible, auditoría, archivo y restauración. Puede excluir o reincorporar reservas a informes con motivo. |
| Administrador | Administración y operación, archivo, restauración y consulta del resumen financiero. La exclusión financiera requiere la cuenta principal. |
| Editor | Reservas, archivo, restauración y módulos de contenido habilitados en la matriz. Sin acceso al resumen global ni a exclusiones. |
| Conductor | Panel de conducción, servicios asignados y QR autorizado. |
| Fotógrafo | Galería según la matriz. |
| Cliente | Mi cuenta y reservas vinculadas a su sesión. |

Aplicar las guardas en páginas y mutaciones. El resumen financiero usa importes registrados, separados por moneda. Las marcas de pago manual sin importe y los reembolsos sin importe se identifican aparte. El neto calculable tiene cobertura parcial cuando faltan datos y no representa beneficio. Archivar y excluir son acciones independientes.

## Instalación y adaptación

1. Revisar el repositorio destino, framework, rutas, esquema, proveedores, permisos y despliegue. Mapear cada módulo a su equivalente y clasificarlo como reutilizable, adaptable o incompatible.
2. Crear una rama en el proyecto autorizado y separar los cambios por módulo. Ejecutar `npm ci` con Node 22. Adaptar `wrangler.jsonc`, scripts que nombran D1, entorno local, componentes de marca y diccionarios. Conservar el archivo de bloqueo.
3. Crear una D1 local de prueba o restaurar una copia desidentificada autorizada. Aplicar migraciones compatibles. Validar integridad, historial, conteos y consultas antes y después. Aplicar datos sintéticos de manera separada.
4. Ejecutar lint, TypeScript, build de Next.js y OpenNext y E2E aislados. Reutilizar `scripts/test-driver-operations.mjs`, `scripts/test-immersive-gallery.mjs` y las pruebas unitarias según los módulos adoptados. Verificar roles con navegación directa y guardas de mutación.
5. Validar un preview con Worker, D1 y proveedores de prueba propios. Antes de producción, verificar copia o punto de Time Travel y confirmar el orden de migración y despliegue. El rollback de Worker conserva el esquema actual. Restaurar D1 es una operación separada que puede afectar escrituras posteriores.
6. Registrar SHA, versión del Worker, migraciones y resultados. Validar rutas, idiomas, integraciones habilitadas y ausencia de efectos externos no previstos.

## Plan para Diomi Tours

1. Tras autorización, hacer inventario de solo lectura del repositorio, Worker, base, rutas indexadas, proveedores, roles y reglas comerciales de Diomi. Registrar diferencias frente a esta guía y confirmar si Next.js, Workers y D1 son compatibles.
2. Preparar una propuesta de adopción. Empezar por componentes visuales y accesibilidad compatibles. Evaluar cuenta y galería según su autenticación y almacenamiento. Dejar archivo e informes para cuando se compruebe el esquema y la semántica financiera.
3. Antes de incorporar reservas, pagos, fidelidad, traducción o QR, validar contrato de datos y alcance comercial con el propietario. Definir qué código se adapta y qué se conserva en Diomi.
4. Solo con autorización específica, implementar en rama y preview aislados de Diomi. Usar datos sintéticos y pruebas equivalentes. Solicitar la aprobación de despliegue según su flujo.

Quedan pendientes la prueba PayPal Sandbox y la conciliación de cupones poscaptura en Perez Tours. El plan de Diomi no depende de reutilizar sus credenciales ni de copiar esos flujos sin revisión.

Referencias de origen. [Rutas y permisos](RUTAS.md), [operaciones de conductores](OPERACIONES-CONDUCTORES.md), [integración editorial](BLOQUE-4-INTEGRACION.md) y [auditoría funcional](AUDITORIA-FINAL.md).
