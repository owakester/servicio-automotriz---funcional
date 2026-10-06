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

ServiceCar conserva hasta tres copias locales de recuperación. Estas copias ayudan si se daña el almacenamiento principal del navegador, pero no protegen frente a una pérdida o rotura de la computadora.

Si falla el guardado principal, al volver a abrir el programa se recuperan los cambios de la copia local más reciente. Si aparece una advertencia de guardado, descargá una copia desde Configuración.

Para tener una copia externa:

1. Entrá en **Configuración**.
2. Conectá Google Drive o presioná **Guardar copia** para descargar un archivo.
3. Comprobá una vez por semana que la copia externa sea reciente.

En Configuración se muestra la **Cuenta del taller** prevista para Drive. Presioná **Conectar**, iniciá sesión con ese correo y autorizá el acceso. Luego comprobá que **Cuenta conectada** muestre el mismo correo. Si elegís otra cuenta, el programa rechaza la conexión; las copias locales siguen disponibles. Cambiar la cuenta no mueve los archivos que ya estaban en otro Drive.

Para cambiar de computadora, descargá primero un backup. En la nueva computadora entrá en Configuración y elegí **Importar backup desde archivo**.

## Rutina recomendada

- Todos los días: revisá las órdenes pendientes y actualizá sus estados.
- Al terminar un trabajo: registrá el servicio, costo y kilometraje.
- Una vez por semana: comprobá que exista una copia externa reciente.

## Si algo no funciona

- Si no podés crear un vehículo, primero registrá el cliente.
- Si no podés crear una orden o servicio, primero registrá el vehículo.
- Si Drive está desconectado, volvé a conectarlo desde Configuración.
- Si el programa recuperó datos automáticamente, revisalos y creá una copia externa.
- Si aparece un mensaje de patente o email duplicado, buscá el registro existente.

La misma guía está disponible dentro del programa desde la opción **Ayuda**.
