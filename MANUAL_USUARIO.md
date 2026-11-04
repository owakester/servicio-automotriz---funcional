# Manual de usuario de ServiceCar

ServiceCar está pensado para administrar un taller mecánico pequeño desde una sola computadora. Esta guía explica el uso diario sin términos técnicos.

## Antes de empezar

- Usá siempre la misma computadora y el mismo navegador.
- Abrí siempre `http://localhost:5173`. No cambies a otra dirección o puerto: el navegador guarda los datos por dirección.
- Mantené una sola pestaña de ServiceCar abierta.
- No borres los datos del navegador ni trabajes en modo incógnito.
- Conectá Google Drive o descargá periódicamente una copia externa.

## Circuito de trabajo

Seguí siempre este orden:

1. **Cliente:** registrá al dueño y sus datos de contacto.
2. **Vehículo:** asociá el automóvil con el cliente.
3. **Orden:** anotá el trabajo solicitado, prioridad, presupuesto y vencimiento.
4. **Servicio:** registrá el trabajo realizado, el costo final y el kilometraje.

## Registrar un cliente

1. Entrá en **Clientes**.
2. Presioná **Nuevo Cliente**.
3. Completá nombre, email y teléfono.
4. Presioná **Crear**.

El programa no permite repetir emails. Un cliente con vehículos asociados no puede eliminarse.

## Registrar un vehículo

1. Comprobá que el dueño ya exista en Clientes.
2. Entrá en **Vehículos** y presioná **Nuevo Vehículo**.
3. Elegí al cliente.
4. Completá patente, marca, modelo y año.
5. Presioná **Crear**.

La patente debe tener formato `ABC123` o `AB123CD`. No se permiten patentes repetidas.

El cliente se elige al crear el vehículo y después queda fijo. Al editar podés corregir los datos del automóvil, pero no cambiar el cliente asociado.

## Crear y actualizar una orden

1. Entrá en **Órdenes** y presioná **Nueva Orden**.
2. Elegí el vehículo. El cliente se completa automáticamente.
3. Describí el trabajo solicitado.
4. Indicá prioridad, presupuesto y fecha de vencimiento si corresponde.
5. Actualizá el estado a medida que avanza el trabajo.

La orden representa el trabajo pendiente o en curso.

### Consultar Servicios sin perder lo escrito

- Elegí **Continuar después** (también se conserva el borrador al cerrar el formulario con Escape o fuera de él). Después podés ir a Servicios y volver a Órdenes → **Continuar borrador**.
- Al elegir el vehículo, podés seleccionar un servicio en **Traer información de un servicio de este vehículo** y presionar **Agregar descripción y observaciones**. Se suman al texto existente; revisá estado, fechas y presupuesto por separado.
- El borrador se conserva en esa pestaña, incluso al recargar si el navegador lo permite. No es una orden guardada ni una copia de seguridad: presioná **Crear Orden** o **Actualizar** antes de terminar de trabajar. Si el navegador no permite conservarlo al recargar, el programa lo avisa.
- **Descartar borrador** pide confirmación si hay cambios y elimina solo lo que no guardaste. Si la orden original cambió o fue eliminada, el borrador no la sobrescribe: conservá el texto y revisá el registro.

### Compartir el trabajo por WhatsApp

1. Guardá la orden y presioná **WhatsApp** en su fila (disponible en todos los estados).
2. Revisá el teléfono y la vista previa editable. Corregir el destinatario allí no modifica la ficha del cliente.
3. Si corresponde, elegí **Agregar observaciones** o **Agregar presupuesto estimado**. Revisá que no incluyan notas internas; el presupuesto no es un comprobante de pago.
4. Presioná **Abrir WhatsApp** y confirmá el envío dentro de WhatsApp. El programa no envía mensajes automáticamente y no adjunta un PDF. Para compartir un PDF, generá el documento y adjuntalo manualmente en el chat.

El botón de PDF abre un documento para imprimir. Para guardarlo como PDF, usá **Imprimir → Guardar como PDF** en el navegador. Si bloquea la ventana, se descarga el documento HTML para abrirlo e imprimirlo.

## Registrar un servicio

1. Entrá en **Servicios** y presioná **Nuevo Servicio**.
2. Elegí el vehículo y tipo de servicio.
3. Completá fecha, estado y costo final.
4. Agregá kilometraje, observaciones y próximo servicio cuando corresponda.

El servicio representa el trabajo efectivamente realizado y forma parte del historial del vehículo.

## Leer los reportes

En **Reportes**, el «Total de trabajos realizados» suma solamente servicios con estado **Completado**. Los pendientes, en progreso y cancelados no se suman. El programa no registra pagos: ese importe no confirma cuánto se cobró. El listado anual de servicios incluye todos los estados.

## Copias de seguridad

Brabus Service guarda los registros en un archivo SQLite de esta PC, fuera del navegador. Cada cambio confirmado genera también un JSON en la carpeta de datos; se conservan copias recientes y diarias. La ruta aparece en el aviso superior. Estas copias no protegen frente a una rotura del disco: necesitás además Drive u otro dispositivo.

El estado normal ocupa una línea: **Datos guardados · Drive actualizado**. En **Ver detalles** podés consultar la carpeta y las fechas confirmadas. Si hay un guardado en curso, una advertencia o una copia pendiente, el aviso completo aparece automáticamente; no cierres mientras diga **Guardando**. Si aparece un error, no repitas el alta de inmediato: conservá lo que escribiste y recargá para comprobar si quedó guardada. Si hay otra pestaña abierta o un conflicto de revisión, cerrá las duplicadas y recargá. No borres archivos ni datos del navegador para solucionar un error.

### Primera apertura después de actualizar

1. Conservá el JSON anterior sin modificarlo y no limpies el navegador.
2. Si el programa encuentra registros del navegador, elegí **Migrar estos registros al disco**, revisando las cantidades. Si tenés un JSON, usá **Importar una copia JSON existente**; sirven los archivos anteriores, incluso los descargados de Drive.
3. Confirmá que aparecen los clientes, vehículos, servicios y órdenes esperados. Las fechas, documentos y referencias a fotos se conservan.
4. **Empezar sin registros** es únicamente para una instalación nueva, nunca para recuperar un taller.

Para tener una copia externa:

1. Entrá en **Configuración**.
2. Conectá Google Drive o presioná **Guardar copia** para descargar un archivo.
3. Revisá todos los días la fecha de la última copia externa confirmada. Los cambios pendientes se intentan subir a los 5 minutos, con el programa abierto y Drive conectado. Si el aviso dice pendiente, revisá la conexión en Configuración.

En Configuración se muestra la **Cuenta del taller** prevista para Drive. Presioná **Conectar**, iniciá sesión con ese correo y autorizá el acceso. Luego comprobá que **Cuenta conectada** muestre el mismo correo. Si elegís otra cuenta, el programa rechaza la conexión; las copias locales siguen disponibles. Cambiar la cuenta no mueve los archivos que ya estaban en otro Drive.

Para cambiar de computadora, descargá primero un backup. En la nueva computadora entrá en Configuración y elegí **Importar backup desde archivo**.

## Rutina recomendada

- Todos los días: revisá las órdenes pendientes y actualizá sus estados.
- Al terminar un trabajo: registrá el servicio, costo y kilometraje.
- Todos los días: comprobá que exista una copia externa reciente y que Drive no figure pendiente.

## Si algo no funciona

- Si no podés crear un vehículo, primero registrá el cliente.
- Si no podés crear una orden o servicio, primero registrá el vehículo.
- Si Drive está desconectado, volvé a conectarlo desde Configuración.
- Si el programa recuperó datos automáticamente, revisalos y creá una copia externa.
- Si aparece un mensaje de patente o email duplicado, buscá el registro existente.

La misma guía está disponible dentro del programa desde la opción **Ayuda**.
