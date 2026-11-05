# Gestión operativa de conductores

- Gestión → Usuarios permite crear un conductor, actualizar su perfil o cambiar su acceso. La cuenta administrativa puede usar el panel de conducción con su sesión habitual.
- Gestión → Servicios y asignaciones permite asignar una reserva confirmada. Cada reserva tiene como máximo una asignación vigente. Una reasignación conserva la anterior en el historial. Si la salida ya empezó, se requiere retirarla explícitamente antes de reasignar. El sistema bloquea la misma fecha y hora de recogida para un conductor. El equipo revisa la duración y el trayecto al planificar.
- El conductor solo ve sus asignaciones. El teléfono se muestra únicamente durante una asignación confirmada y vigente. La llegada, el inicio y el fin son hitos operativos independientes de los pagos y del estado comercial.
- El administrador genera y comparte el QR del servicio. Con sesión abierta, el conductor escanea con la cámara del teléfono, abre el enlace y confirma la validación. También puede pegar el código. El enlace lleva un valor aleatorio en el fragmento y D1 guarda únicamente su hash. Revocar o regenerar invalida el anterior. Una reserva admite una sola validación, incluso si se reasigna.
- El fin operativo y el QR no otorgan fidelización. La acción comercial existente de completar la reserva registra el viaje una sola vez.

## Migración y recuperación

La migración 0019 amplía el CHECK del rol mediante cambios de columnas, sin sustituir la tabla de usuarios. Las asignaciones y los QR viven en tablas nuevas. Los cambios de rol o actividad revocan las sesiones y, cuando corresponde, retiran los servicios pendientes del conductor.

Antes de fusionar, verifica la prueba de D1 aislada con datos previos y registra un punto de recuperación de D1. El workflow existente aplica las migraciones antes del despliegue. Si falla el código después de aplicar la migración, restaura la versión anterior del Worker dejando el esquema ampliado. Si hace falta deshacer cambios de datos, revisa primero las escrituras posteriores y usa el punto de recuperación aprobado. Evita borrar las tablas operativas como parte de un rollback normal.

Para repetir la prueba en local, compila OpenNext, instala Chromium con Playwright y ejecuta `node scripts/test-driver-operations.mjs`. La prueba crea su propio Worker en loopback, una D1 temporal y cuentas ficticias. No recibe credenciales ni bindings remotos.
