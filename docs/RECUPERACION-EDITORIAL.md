# Recuperación editorial en preview

El cron existente de Cloudflare llama a `preview-worker.ts` cada minuto. El
Worker firma la llamada interna a `src/app/api/internal/editorial-recovery/route.ts`
con `AUTH_SECRET`. La ruta asigna un turno a cada módulo en una rotación de seis
minutos. `src/lib/admin/editorial-recovery.ts` toma un registro vigente por turno
y recupera un campo elegible. Los tours conservan su flujo de recuperación en
`src/lib/admin/tour-editorial-translation.ts`. Las opiniones quedan excluidas.

El inglés automático de categorías, blog, FAQ, galería y notas de traslados
persiste en D1 en `content_translation_cache`. Los lectores públicos consultan
esa tabla por la huella del texto vigente. Las traducciones manuales tienen
prioridad y permanecen separadas. Los tours utilizan además su tabla de
traducciones. Las visitas públicas solo leen los datos persistidos.

El adaptador existente conserva la reserva atómica, los 24 intentos de
inferencia y 6.000 caracteres diarios UTC, los 800 caracteres por solicitud y
los tres intentos máximos por texto. Respeta la pausa transitoria y la pausa por
cuota, y renueva el presupuesto al primer uso elegible del día siguiente. Una
edición posterior a una ejecución tiene una huella distinta y no puede publicar
el inglés anterior. Se omiten registros despublicados en los cinco módulos
extendidos. El cron solo recupera campos que tengan estado pendiente o fallido.

## Despliegue y comprobación

- Usar el workflow «Preview aislado - video ImageKit» en la rama de preview.
- Comprobar el SHA de la versión activa y su 100 % de tráfico.
- Confirmar que existen las migraciones 0016 y 0017 y la tabla de presupuesto
  ya aprovisionada. La extensión del cron no requiere migración nueva.
- Comprobar el binding `AI`, `EDITORIAL_TRANSLATION_WORKERS_AI=true`,
  el interruptor `halted=0` y `DISABLE_EXTERNAL_BOOKING_EFFECTS=true`.
- Ejecutar typecheck y ESLint. Con datos QA mínimos, comprobar estado pendiente,
  inferencia programada, persistencia y lectura pública. Comparar el presupuesto
  antes y después de las lecturas públicas y eliminar las filas QA por identidad.
- Para adaptar esta plantilla, mapear los campos fuente y su lector inglés,
  mantener el estado persistente y añadir el módulo a la rotación existente.
  Revisar primero el presupuesto, los permisos y las reglas de privacidad
  del entorno de destino.
