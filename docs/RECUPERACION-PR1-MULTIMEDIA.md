# Recuperación del PR #1

Base: `bacb691146cca30cfd7a29409455ffd891de2b61` (main).
Origen: los 84 commits entre `7d407dc` y `2a279c0`. Se comparó el diff
de origen con el árbol actual y se recuperaron cambios por funcionalidad.
El tag oficial `v0.1.0` sigue en `33fbe47dc4d5f31209b972de5a0043b11b92150c`.

| Funcionalidad | Clasificación e integración |
| --- | --- |
| Reproductor ImageKit, miniatura, carga al pulsar, progreso y reintento | Pendiente. Se recupera en portada y galería, con interfaz ES/EN, `playsInline` y permiso CSP exclusivo para medios. |
| HLS y móvil | Reproducción nativa donde el navegador y la URL lo permitan. El PR de origen no incorpora un motor HLS alternativo. Se conserva la evidencia móvil anterior; falta un origen HLS de prueba. |
| Galería administrativa, grupos y texto alternativo | Se recuperan buscador, filtros y selector. La generación de grupos y texto alternativo ya existía en main. |
| Subida masiva y fallos parciales | Se recuperan las tandas y la deduplicación por contenido dentro de la selección. Máximo 100 por selección y 20 o 60 MiB por petición. Las respuestas conservan nombre e índice de origen y el formulario mantiene los resultados parciales. |
| Persistencia D1 | Las tablas existentes ya admiten imágenes y vídeos. El límite anterior de 20 se adapta a 100. Una transacción registra la selección y evita duplicados de URL en galería si se reenvía. Sin migración. |
| Seguridad de la subida | Se conserva el control de roles, se reduce el detalle del error externo y se verifica el origen y prefijo HTTPS exactos de ImageKit. |
| Dependencias y herramientas | El lockfile de main ya coincide con el de origen. Se recuperan catálogo, validación de sincronización y auditoría bloqueante de severidad alta dentro del CI existente. |
| Edición, traducciones y protección de aprobación | Ya integradas y ampliadas en main. Se conservan sus acciones, lecturas y cron. Las altas masivas no disparan traducción en bloque. |
| Formularios, correo, pagos y WhatsApp de preview | Controles de aislamiento exclusivos de preview. Se conserva la lógica productiva y se prueba sin efectos externos. |
| Redirección de sesión revocada | El cambio del PR de origen modifica el proxy y el acceso por rol. Queda fuera de este PR multimedia, pendiente de una validación autenticada dedicada antes de integrarlo. |
| Versionado TOML y workflows de preview | TOML duplicaría el flujo SemVer oficial. Los workflows antiguos tienen ramas y recursos de prueba fijados. Se conserva el workflow actual, sin mover el tag ni los artefactos de release. |

## Versiones conservadas

Next.js y eslint-config-next 16.4.4, React 19.2.8, Zod 4.6.7,
OpenNext Cloudflare 1.20.15, Wrangler 4.156.2, TypeScript 5.9.3,
Playwright Core 1.63.0, glob 14.0.3 y minimatch 11.0.4.

## Evidencia y límites

- Prueba móvil previa en la rama de origen, con ocho casos aprobados.
  [Actions 41697217656](https://github.com/carlosprztours/prz-tours/actions/runs/41697217656)
- Evidencia de subida y limpieza previa. Se reutiliza sin generar archivos
  nuevos en el proveedor. [Actions 41557308843](https://github.com/carlosprztours/prz-tours/actions/runs/41557308843)
- Las pruebas focalizadas cubren 1/20/21/100 archivos, el límite por bytes,
  duplicados con distinto nombre, resultados parciales y rechazo de URL
  ajena al prefijo configurado. En SQLite, 60 imágenes y 40 vídeos con
  reenvío conservaron metadatos y recuento.
- Un Worker local con D1 temporal devolvió HTTP 200 en portada, galería
  y reserva ES/EN, incluyó CSP ImageKit y bloqueó panel, subida y pago
  para usuarios no autenticados. Sin reservas, cargos ni correos.
- El MP4 real de preview respondió HTTP 206 con firma MP4. La consulta
  de la miniatura agotó el tiempo en este entorno y Chromium no se pudo
  instalar por un ZIP truncado. Queda pendiente la reproducción móvil del
  candidato exacto y una verificación HLS con una fuente real.
