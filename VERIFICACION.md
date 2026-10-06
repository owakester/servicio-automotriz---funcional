# Verificación del 6 de octubre de 2026

## Comprobado

- `npm test`: respaldo/recuperación, 10 casos de integridad y 13 casos de regresión funcional.
- Restauración del JSON sintético `scripts/fixtures/qa-backup.json` mediante el código real de importación, con almacenamiento y FileReader simulados: conserva las cuatro colecciones, sus relaciones, fechas y adjuntos.
- Reportes: excluyen pendientes, en progreso y cancelados; convierten importes numéricos almacenados como texto. Los CSV de clientes también usan solo servicios completados.
- Manejo de una excepción después de generar el documento de la orden: muestra el aviso sin lanzar el TypeError anterior.
- `npm run build`: compilación correcta. Advertencia informativa por datos antiguos de Browserslist.
- Puerto fijo: una segunda instancia devuelve «Port 5173 is already in use» y no cambia a 5174.
- Interfaz en `http://127.0.0.1:5173`, con almacenamiento separado de `localhost`: creación de cliente, vehículo, orden y servicio. Un servicio completado de $55.000 aparece en Reportes; al cancelarlo, el importe vuelve a $0. No hubo errores de ejecución registrados durante este circuito.

## Pendiente de prueba manual

- Subida real de fotos a Google Drive y su conservación después de editar: los adjuntos están cubiertos por regresiones, pero la subida remota requiere conexión con la cuenta del taller.
- Descargar y restaurar una copia real de Google Drive. La búsqueda «backup-autoservice» no encontró archivos en la cuenta abierta; falta identificar la cuenta correcta o disponer del JSON descargado.
- Descarga e importación de JSON de extremo a extremo en el navegador: se pulsó «Guardar copia», pero no se pudo confirmar el archivo descargado. La herramienta de navegador rechazó cargar el archivo de prueba. Esto no demuestra un fallo del programa; requiere comprobar ambos pasos manualmente.

Los datos y respaldos originales del taller no fueron reemplazados ni eliminados. Los registros sintéticos quedan únicamente en el almacenamiento de la dirección de prueba `127.0.0.1`.

No importar la fixture QA en la dirección habitual del taller: reemplaza sus datos. Para el uso diario, mantener siempre `http://localhost:5173`.
