# Preparación de integración del Bloque 4

Base productiva auditada: `7d407dc8b1722d7d9b9eb003ee835be8961f8ab2`.
Referencia verificada en preview: `2a279c0741cb23150a22b8b3247a9ba70567f6af`.
El PR #1 contiene 84 commits y 76 archivos modificados. Conservar esa rama
como referencia. El candidato local toma el código editorial, sus lectores
públicos, la optimización de sesión de ámbito de petición y el lockfile de
dependencias actualizado. Mantiene el workflow productivo de main.
La página de reserva recibe el idioma para leer las notas de traslado.

## Alcance separado

- Editorial: traducciones, persistencia, lectura pública y edición. La
  recuperación tiene lógica de selección, pero falta conectarla en producción.
- Herramientas aisladas: workflows de vídeo, pruebas móviles, ImageKit,
  renovación de dependencias y scripts de QA. Quedan fuera del candidato.
- Infraestructura: catálogos de herramientas, versionado y configuración del
  Worker de preview. Quedan fuera del candidato.
- Cambios con alcance propio: CSP y reproductor ImageKit, carga en lotes,
  redirecciones de login y registro, reservas, correos y pagos de preview.
  Quedan fuera del candidato. Los formularios y adaptadores de pago
  productivos conservan su lógica de main.

## Producción y puertas de publicación

Worker `prz-tours`, D1 `prz-tours` y ambiente GitHub Actions `production`.
D1 ya tiene hasta la migración 0015. Las migraciones 0016 y 0017 son aditivas.
El Worker activo no tiene binding AI ni cron. El presupuesto de preview se
aprovisionó directamente en D1 y no existe en producción. Antes de activar
producción, preparar la fila de presupuesto en su D1, reutilizar el cron
firmado con el destino productivo y validar la cuota disponible. No iniciar
un barrido histórico.

Definir y verificar cómo quedan pendientes de revisión los textos de
seguridad, recogida, condiciones e importes antes de permitir su publicación
automática. El código de preview puede publicar su salida al traducirla.
Comprobar también que las notas de recogida de tours con traducciones
manuales siguen visibles donde corresponde y que las etiquetas de galería
conservan su accesibilidad.

## Recuperación

Antes de migrar, renovar y verificar un bookmark de D1 Time Travel. Registrar
la versión activa de Worker y recuentos de referencia. Usar el workflow
productivo existente después de aprobar las pruebas del candidato y
verificar el acceso del ambiente GitHub Actions. Si falla el Worker, volver
primero a la versión anterior. Si se activó el cron, detener inferencias con
el interruptor operativo. Las tablas aditivas pueden permanecer durante la
reversión del código. Restaurar D1 solo tras evaluar y preservar las
escrituras legítimas posteriores al bookmark. No copiar datos de preview.

Para otra web basada en la plantilla, conservar el aislamiento de bindings,
verificar el lector de cada campo traducido y ensayar el rollback antes de
habilitar inferencias. El versionado oficial queda para el Bloque 4.1.
