# Versiones y publicación de Perez Tours

El paquete declara `0.1.0` desde antes del Bloque 4.1. En el arranque se
comprobó que no había tags ni releases. `v0.1.0` es la primera etiqueta
propuesta. Los builds históricos se identifican por SHA y no se etiquetan
retroactivamente. La base de comparación inicial es el SHA productivo
`efd1affe860e72716c7aa44a9e906ecbccaebf7e`.

## Preparar un candidato

1. Traer `main` y todas las etiquetas con `git fetch origin main --tags`.
2. Ejecutar `npm run release:suggest`. `fix`, `perf`, `revert` y
   `security` sugieren PATCH. `feat` sugiere MINOR. Un tipo con `!` o
   un pie `BREAKING CHANGE:` sugiere MAJOR. El informe avisa por cambios
   en D1, API, configuración o seguridad. Solo documentación no sugiere
   incremento, y los cambios materiales sin convención requieren revisión.
3. Elegir manualmente el tipo y documentarlo en `release-plan.json`.
   Revisar el diff y los PR. Usar `npm version <versión> --no-git-tag-version`
   para alinear el paquete y su lockfile. Anotar cambios y riesgos sin
   copiar mensajes de commits, datos personales, secretos ni credenciales.
4. Ejecutar `npm run release:generate`, comprobar el diff de
   `CHANGELOG.md` y del esquema, y ejecutar `npm run release:check`.
   Las entradas anteriores del changelog se preservan. El changelog se
   genera a partir de descripciones verificadas y revisadas.
5. Después de guardar el candidato en Git, ejecutar
   `npm run release:prepare`. Los borradores salen en `.release/`,
   fuera del control de versiones. El SHA de salida corresponde a HEAD,
   por lo que para una revisión reproducible se usa un árbol limpio.

## Desplegar y publicar

La fusión aprobada sigue usando el despliegue existente a producción.
Antes de migrar D1, revisar las migraciones del manifiesto y verificar un
bookmark de Time Travel. Guardar el SHA y versión anterior del Worker.
Confirmar el SHA activo y comprobar las rutas públicas ES/EN tras el
despliegue. Revisar que el panel autenticado muestra versión, SHA y entorno.

El propietario autoriza la release mediante **Deploy a Cloudflare → Run
workflow → main → operation: release**, con `approved_sha` igual al SHA
actual de main y `deploy_run_id` igual a la ejecución exitosa del despliegue.
Este evento no ejecuta el job de despliegue. El publicador comprueba el
repositorio, el SHA, el workflow, el job productivo y su paso de publicación.
La evidencia de Actions es histórica. Confirmar también el Worker activo,
especialmente si hubo un rollback después del job exitoso.

El workflow crea la etiqueta exacta, verifica que apunta al SHA aprobado,
adjunta el manifiesto al borrador y publica solo tras comprobar su digest.
Si falla, reintentar con el mismo SHA y el mismo ID de despliegue mientras
siga siendo HEAD de main. Se reutilizan los recursos compatibles. Un tag,
release o manifiesto en conflicto requiere revisión manual. No hay
sobrescrituras. Si GitHub rechaza la creación de tags, comprobar las reglas
del repositorio sin elevar los permisos de otros jobs.

## Manifiesto AgencyOS v1

`agencyos-update.schema.json` describe el contrato JSON. La preparación
incluye la versión y SHA actuales y candidatos, compatibilidad, migraciones
detectadas por diff, dependencias fijadas, nombres de variables,
comprobaciones, requisitos y recuperación. Para la primera versión
`current.version` y `current.tag` son nulos y su SHA identifica la base
productiva.

La copia adjunta a la release incluye la evidencia de despliegue aprobada.
Para que también funcione con releases inmutables, se adjunta antes de
publicar. Su fecha se obtiene de `published_at` en `publicationSource`.
Actions deja además durante siete días un manifiesto final con
`publishedAt` ya resuelto. Los consumidores deben validar el esquema y
comprobar que el tag resuelve al SHA. `verified` identifica el despliegue
observado en la ejecución indicada. No representa estado en tiempo real.

## Recuperación y traslado a la segunda web

Revertir tráfico del Worker y restaurar D1 son operaciones distintas.
Primero comprobar la compatibilidad del Worker anterior con el esquema
vigente. Las migraciones aditivas suelen poder conservarse. Antes de
restaurar D1 mediante Time Travel, revisar las escrituras legítimas
posteriores al bookmark y confirmar que se pueden preservar.

Para trasladar una mejora, comparar primero los dos árboles y el esquema
de destino. Los scripts, el contrato y los cambios de aplicación aislados
son candidatos a traslado. Adaptar identificador, repo, marca, dominio,
configuración, variables y servicios de despliegue. Revisar cada migración
y sus dependencias en el destino. Mantener separados D1, credenciales,
integraciones, reservas, datos de clientes y contenido editorial.
