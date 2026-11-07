# Auditoría funcional de Perez Tours

Base auditada: `95b3ed7612eea81f72bf5ab1690e83b645f5e38f`. Worker observado: `d5ded125-a6b2-40b0-b0e6-54cdac910be4`, 100 % del tráfico. D1 inicialmente en `0019`. Las fases fundacionales se identifican por sus commits y migraciones, ya que el historial inicial no etiqueta uniformemente cada bloque.

| Módulo | Origen y archivos | Estado y evidencia |
|---|---|---|
| Portada, navegación ES/EN, textos, categorías y filtros | Base `35d2b1b`, `d78b018`, `0009`, `0015`, `SiteHeader`, `db/tours` | Publicado. La auditoría encontró que Portada y Textos tenían páginas y acciones autorizadas, pero faltaban en la matriz de secciones. El ajuste las vuelve accesibles con los mismos permisos editoriales. |
| Tours, relacionados, SEO | Base y #4, `db/tours`, `tours/[slug]`, `0020` | Ocho tours publicados. Consulta bilingüe y metadatos comprobados en QA. La reparación de datos exige los valores auditados y no modifica listas ni precios. |
| Traslados, formularios y estados de reservas | Base y #5, `book-tour`, `db/bookings`, `admin/bookings` | Publicados. Evidencia anterior de reservas aisladas y estados. Sin crear pedidos reales durante esta auditoría. |
| Usuarios, sesiones, credenciales y roles | Base y #5, `auth/dal`, `proxy`, `admin/access`, `admin/users`, migraciones `0006` y `0019` | Login y permisos comprobados con cuentas QA. Google tiene credenciales configuradas, pero el consentimiento real y WebAuthn con dispositivo físico no se probaron. |
| Cuenta personal y seguimiento | Base, `account/page`, `db/bookings`, `track` | Mi cuenta se restringe por ID. Dos de las 16 reservas productivas estaban sin cuenta vinculada; permanecen en D1 y en el panel. |
| Fidelidad, cupones, invitaciones y avisos | `b8d94c1`, `0007`, `db/loyalty`, `CouponsSection`, `InviteLink` | En Mi cuenta existen enlaces, cupones y notificaciones; el contador persistido aparece en Usuarios del panel. Invitación de 10 %, 10 % cada dos viajes completados si no hay cupón activo, y caducidad general de 90 días. El QR no acredita viajes. QA comprueba propiedad, caducidad, consumo y repetición en efectivo, más una sola acreditación al completar la misma reserva dos veces. El alta por enlace, la emisión manual por UI y la entrega real de avisos quedan sin repetir en esta pasada. |
| Pasaporte visual | Cuenta y fidelidad | Ausente. El contador, historial, cupones y avisos existentes pueden alimentar un pasaporte si se aprueba por separado. |
| Conductores, asignaciones y QR | #5, PR #7, `0019`, `admin/operations` | Desplegado. E2E aislado de acceso, asignación, conflictos, QR y revocación. En producción había cero conductores y cero asignaciones. |
| Multimedia y panel de galería | PR #6 y bloque #6, PR #8, `GalleryGrid`, `GalleryVideos`, `SafeImage`, `api/admin/upload` | Foto y vídeo de ImageKit con publicación existente. QA reproduce un clip y comprueba recorte, pausa, zoom, teclado, foco, gesto y movimiento reducido. La carga productiva no se ejecutó; existe evidencia previa de carga aislada. |
| Traducción editorial | #4, PR #2 y #3, `editorial-worker`, `editorial-recovery`, `0016–0018` | Binding AI, flag activo y cron cada minuto; pausa global desactivada. Cero filas traducidas en caché genérica y ninguna fila editorial de tours en la inspección. No se forzó una inferencia en producción. |
| GitHub, Cloudflare, D1 y publicación | Infraestructura base, PR #4–#5, `deploy.yml`, `RELEASES.md` | CI y deploy existentes. D1 con Time Travel disponible. La release histórica y su manifiesto se conservan. |

## Tours

T = título; R = resumen; D = descripción; SEO = título y descripción; L = incluidas/no incluidas/qué llevar. ES/EN son filas editoriales, no traducciones de los datos comerciales.

| Tour | ES T/R/D/SEO | EN T/R/D/SEO | L ES/EN | Pendiente editorial |
|---|---|---|---|---|
| Damajagua | T corregido; resto presente | Presente | 6/3/6 ambos | SEO dice US$60, precio base US$55. |
| ATV | Presente | Presente | 5/4/4 ambos | — |
| Ciudad de Puerto Plata | T, D, SEO y recogida corregidos; R conservado | Presente y conservado | 5/3/4 ambos | La entrada a la fortaleza figura incluida y excluida. |
| Monkey Jungle | T y R corregidos; D y SEO conservados | Presente | 4/3/5 ambos | Confirmar si la tirolina está incluida: el resumen EN lo anuncia y las listas no lo aclaran. |
| Dune Buggy | Presente | Presente | 5/4/6 ambos | SEO US$60 frente a precio base US$110; la descripción SEO indica 4x2 en ES y 4x4 en EN. |
| Esnórquel en Sosúa | Presente | Presente | 5/3/4 ambos | — |
| Cayo Arena | Presente | Presente | 6/4/6 ambos | Paradise Island se conserva como nombre alternativo. |
| Cabalgata en Puerto Plata | Ficha y recogida en ES | R y descripción SEO completados donde faltaban | 0/0/0 ambos | Faltan inclusiones, exclusiones y recomendaciones confirmadas. |

## Permisos y menús

| Rol existente | Menú Gestión en Mi cuenta | Acceso de servidor |
|---|---|---|
| Administrador | Reservas, Conductores, Asignaciones, Conducción, QR, Clientes y fidelización | Módulos de administración existentes. El superadministrador conserva el acceso a configuraciones sensibles y la protección de su cuenta. |
| Editor, perfil limitado existente | Reservas | Editorial, reservas, ocupación, cupones y mensajes según la matriz previa. Sin usuarios, ajustes globales, credenciales ni operaciones de otros conductores. |
| Conductor | Conducción, QR | Solo asignaciones propias y validaciones autorizadas. |
| Fotógrafo | Sin Gestión | Solo galería y medios autorizados. |
| Cliente | Sin Gestión | Funciones personales y reservas vinculadas a su usuario. |

## Integraciones

| Integración | Activación observada | Alcance de la evidencia |
|---|---|---|
| ImageKit | Bindings presentes | Reproducción pública; E2E de carga anterior. |
| Workers AI | Binding, flag y cron configurados | Sin inferencia real nueva ni traducción editorial registrada en las tablas consultadas. |
| Resend | Token, remitente y destinatario configurados | Sin envío real de auditoría. |
| PayPal | Modo live y credenciales presentes | Sin cargos; la reconciliación poscaptura conserva el flujo previo. |
| Stripe | Sin bindings de clave y webhook | Integración implementada, desactivada por configuración. |
| WhatsApp | Número configurado | Enlaces de contacto y operación manual. Sin envío de auditoría. |
| Push/PWA | Manifest, service worker y claves VAPID; cero suscripciones | Sin prueba de entrega push ni instalación física en esta auditoría. |
| Google y passkeys | Credenciales OAuth presentes y flujo WebAuthn implementado | Sin consentimiento OAuth ni prueba biométrica real. |

## Pendientes

- **Crítico:** el flujo PayPal poscaptura no reserva el cupón antes de cobrar. El cambio atómico cubre efectivo y reservas sin cobro previo. Hace falta diseñar y probar la reserva del descuento, la reconciliación y el tratamiento de órdenes ya abiertas sin tocar pagos reales.
- **Importante:** validar las condiciones contradictorias y las listas de cabalgata antes de editar la información comercial; verificar emisión concurrente de recompensas desde reservas distintas, entregas de correo/push, consentimientos externos y actividad de Workers AI con entorno de prueba autorizado. Las reservas históricas sin usuario requieren vinculación verificada.
- **Opcional:** pasaporte visual, condicionado a una decisión de producto.
