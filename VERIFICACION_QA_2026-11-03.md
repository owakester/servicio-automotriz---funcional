# Correcciones y verificación — 3 y 4 de noviembre de 2026

## Alcance y protección de datos

Se revisaron las causas en el código antes de modificarlas. Las pruebas usan
registros sintéticos, DOM simulado, almacenamientos en memoria y SQLite temporal.
No se abrió ni reemplazó la base del taller, no se modificaron sus backups y no
se enviaron mensajes, fotos ni documentos a terceros.

No hay migración de registros ni cambio del formato de los backups JSON.
Las validaciones nuevas de fechas se aplican al crear/editar servicios, no
reescriben el historial ni impiden importar las copias anteriores.

## Causas confirmadas y cambios

- **Agregar Foto:** los botones auxiliares de `ImageUploader.vue` no declaraban
  tipo y por defecto enviaban el formulario de la orden. Ahora todos son
  `type="button"`, incluidos vista, eliminación, cancelación y botones de diagnóstico.
  Subir una foto sigue guardando su adjunto por separado, sin confirmar el texto
  pendiente de la orden. Se registró también el diálogo de subida en la gestión
  de foco para no interferir con la contención de teclado de la orden.
- **CSV:** Reportes solo entrecomillaba valores con comas, sin duplicar comillas
  ni proteger saltos de línea. Próximos Servicios tenía otro escape parcial.
  Ambos reutilizan ahora el escape de Configuración, extraído a `utils/csv.js`.
  Se conserva la protección contra fórmulas, se incluye BOM UTF-8 y se separan
  registros con CRLF. Todos los campos se entrecomillan correctamente.
- **Costo cero:** `servicio.costo || ''` descartaba el cero al editar. Se usa
  `??`, también para el kilometraje cero.
- **Fechas de servicio:** faltaba comparar próxima fecha contra fecha del
  trabajo. La UI muestra el error junto al campo y el CRUD vuelve a validarlo
  antes de guardar. Se permiten la misma fecha y no programar un próximo servicio.
- **Fechas de Reportes:** un rango invertido se filtraba como cero registros.
  Ahora se muestra un error, se oculta el resumen de ese período y se bloquea
  su exportación. También se rechazan fechas ausentes y rangos inválidos desde
  el composable, para no depender solo de la pantalla.
- **Notificaciones:** estaban fijadas a la parte superior, por encima del menú.
  Se movieron abajo a la izquierda, con altura limitada, contenedor transparente
  a los clics y espacio reservado para WhatsApp.
- **Foco:** la directiva contenía Tab solo si el foco ya estaba dentro. Ahora
  enfoca al abrir, devuelve el foco al cerrar y atiende únicamente el diálogo
  superior. Se cubrieron Tab, Shift+Tab y foco inicialmente fuera del modal.
- **Pantalla angosta:** la cabecera de fotos no permitía salto de línea y los
  controles de la orden conservaban su ancho mínimo intrínseco. Se agregaron
  envoltura, anchos acotados y menor relleno en móvil. WhatsApp pasa de z-50 a
  z-40, por debajo de los modales z-50.
- **Compartir fotos sin adjuntos:** la función abría WhatsApp sin comprobar
  fotos. Ahora consulta la orden guardada, muestra una explicación y no abre
  WhatsApp. La tabla identifica las órdenes «Sin fotos» y el título aclara que
  las fotos existentes se adjuntan manualmente.
- **Compartir la orden:** el presupuesto estaba como agregado opcional y faltaba
  el kilometraje. Ambos aparecen ahora en la vista previa editable: presupuesto
  de la orden guardada y kilometraje de la ficha del vehículo al abrirla. Un dato
  ausente se indica como «Sin registrar» y cero se conserva como valor válido.
  Editar el mensaje no modifica los registros ni envía mensajes automáticamente.
- **Cierre de modales:** Órdenes y Servicios comprueban que el gesto empiece y
  termine en el fondo antes de cerrar. Arrastrar para seleccionar texto desde
  dentro hacia fuera no descarta la edición ni cierra el detalle de un servicio.

## Pruebas realizadas

- `npm test`: batería completa aprobada, incluidos almacenamiento/recuperación,
  borradores de órdenes, importación de texto desde Servicios, rechazo de bajas
  con dependencias, cuenta de Drive simulada y recordatorios.
- `npm run test:qa-corrections`: **14/14** grupos aprobados. Compila y monta los
  componentes Vue reales en jsdom; simula únicamente la API de disco y Drive.
  Verifica que seleccionar fotos desconectado no envíe el formulario y que una
  subida simulada guarde exclusivamente el adjunto, con la descripción anterior
  intacta y el borrador todavía abierto.
- `npm run test:order-workflow`: **16/16** grupos aprobados, incluidos presupuesto
  y kilometraje, ceros, datos faltantes y el texto exacto del enlace de WhatsApp.
- Lectura de CSV con [CSV Parse](https://csv.js.org/parse/options/), sin permitir
  comillas ni cantidades de columnas inconsistentes. Se recuperan exactamente
  comas, comillas internas, CRLF/LF, encabezados especiales y ceros en Reportes,
  Configuración y Próximos Servicios. Una muestra malformada es rechazada.
- Restauración de un JSON anterior sintético: conserva las cuatro colecciones y
  sus fechas históricas, incluso si una fecha antigua no cumpliría la validación
  nueva de edición.
- `npm run build`: compilación de producción aprobada.

Se ajustaron dos supuestos de las pruebas antiguas: una expresión regular exigía
CSV sin entrecomillar (se sustituyó por lectura CSV real) y una fixture colocaba
el próximo servicio antes del trabajo (se corrigió solo la fixture).

## PDF, Drive y WhatsApp: investigación separada

### Impresión / PDF

Confirmado en `usePDF.js`: se prepara HTML para imprimir o guardar como PDF con
el navegador. `subirOrdenAGoogleDrive` guarda una copia `.html`, no un PDF binario.
Eso describe el flujo existente; no se añadió un conversor ni se afirmó que
hubiera fallado la impresión. Los mensajes y el título del botón ahora lo aclaran.

Se detectó y reprodujo otro defecto real: texto ingresado en los campos se
interpretaba como HTML. Se escaparon los campos; una prueba que fallaba antes
ahora verifica que nombre, descripción y observaciones se conservan como texto.
La generación de HTML y el logo están cubiertos; impresión, paginación visual y
archivo PDF final quedan pendientes en un navegador conectado.

### Google Drive

Pasaron las pruebas simuladas de cuenta autorizada, rechazo de otra cuenta,
renovación y errores de red. También están cubiertos la restauración simulada
desde Drive a SQLite y el comportamiento de fotos sin conexión.

No se verificó una subida/descarga real con la cuenta del taller. Los resultados
simulados no prueban permisos efectivos, ventanas OAuth ni disponibilidad remota.
No se ampliaron permisos ni se hicieron públicas las fotos para sortear la prueba.

### WhatsApp

Se verifican el texto, teléfono, enlace preparado y bloqueo de órdenes sin fotos,
sin abrir un chat real. `wa.me` prepara un mensaje; la entrega y el envío requieren
acción del operador. El enlace de texto no adjunta fotos ni PDF automáticamente.
No se verificó recepción por el cliente y no se enviaron mensajes de prueba.

## Pendientes y limitaciones del entorno

La herramienta de control devolvió «The browser access host is unavailable» y
el acceso nativo devolvió «Computer Use native pipe is unavailable». Esto es una
limitación de la conexión de pruebas, no evidencia de un fallo del portal.

Pendiente en una instancia aislada, nunca importando la fixture sobre el taller:

1. A 390 px, recorrer la orden completa, incluida la sección de fotos y el pie;
   comprobar que no aparezca desplazamiento horizontal y que WhatsApp no la tape.
2. Acumular avisos y recorrer la navegación: confirmar posiciones y clics reales.
3. Probar impresión y guardar un PDF con varias páginas; revisar logo y cortes.
4. Conectar Drive manualmente y subir/descargar una imagen y una copia sintéticas.
5. Con aprobación del destinatario, comprobar adjunto manual y recepción por WhatsApp.

Las comprobaciones de responsive y capas fueron estructurales, no una validación
de píxeles en Chrome. No se aplicaron cambios especulativos para resolver los
bloqueos de conexión del entorno.
