import assert from 'node:assert/strict'
import { build } from 'esbuild'
import 'fake-indexeddb/auto'

class LocalStorageMock {
  #data = new Map()

  get length() { return this.#data.size }
  getItem(key) { return this.#data.has(String(key)) ? this.#data.get(String(key)) : null }
  setItem(key, value) { this.#data.set(String(key), String(value)) }
  removeItem(key) { this.#data.delete(String(key)) }
  key(index) { return [...this.#data.keys()][index] ?? null }
  clear() { this.#data.clear() }
}

globalThis.localStorage = new LocalStorageMock()
globalThis.window = { location: { reload() {} } }

const compilado = await build({
  stdin: {
    contents: [
      "export { useAutoService } from './src/composables/useAutoService.js'",
      "export { useOrdenes } from './src/composables/useOrdenes.js'",
      "export { validarDatosAutoservice } from './src/composables/useDataRecovery.js'",
      "export { useFormValidation } from './src/composables/useFormValidation.js'",
      "export { usePagination } from './src/composables/usePagination.js'",
      "export * from './src/utils/clientIdentity.js'"
    ].join('\n'),
    resolveDir: process.cwd(),
    sourcefile: 'crud-integrity-test-entry.js'
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': '"test-client-id"'
  }
})

const codigo = Buffer.from(compilado.outputFiles[0].contents).toString('base64')
const { useAutoService, useOrdenes, validarDatosAutoservice, useFormValidation, usePagination, esDniCuilValido, formatearDniCuil, etiquetaCliente } = await import(
  `data:text/javascript;base64,${codigo}`
)

const datos = useAutoService()
const gestionOrdenes = useOrdenes()
await datos.inicializacionDatos

const esperarPersistencia = () => new Promise((resolve) => setTimeout(resolve, 10))

const limpiarEstado = async () => {
  datos.clientes.value = []
  datos.vehiculos.value = []
  datos.servicios.value = []
  datos.ordenes.value = []
  await esperarPersistencia()
}

const resultados = []

const probar = async (nombre, prueba) => {
  try {
    await limpiarEstado()
    await prueba()
    resultados.push({ nombre, ok: true })
  } catch (error) {
    resultados.push({ nombre, ok: false, error })
  }
}

await probar('CRUD completo y persistencia de las cuatro colecciones', async () => {
  const cliente = datos.agregarCliente({
    nombre: 'Cliente QA',
    email: 'cliente.qa@example.com',
    telefono: '11-5555-0101'
  })
  const vehiculo = datos.agregarVehiculo({
    clienteId: cliente.id,
    marca: 'Ford',
    modelo: 'Focus',
    patente: 'QA123AA'
  })
  const servicio = datos.agregarServicio({
    clienteId: cliente.id,
    vehiculoId: vehiculo.id,
    tipoServicio: 'Prueba',
    fechaServicio: '2026-09-25',
    estado: 'pendiente',
    costo: 1000
  })
  const orden = gestionOrdenes.crearOrden({
    clienteId: cliente.id,
    vehiculoId: vehiculo.id,
    descripcionTrabajo: 'Orden QA'
  })

  assert.equal(datos.actualizarCliente(cliente.id, { ...cliente, nombre: 'Cliente QA modificado' }).nombre, 'Cliente QA modificado')
  assert.equal(datos.actualizarVehiculo(vehiculo.id, { ...vehiculo, modelo: 'Focus modificado' }).modelo, 'Focus modificado')
  assert.equal(datos.actualizarServicio(servicio.id, { ...servicio, estado: 'completado' }).estado, 'completado')
  assert.equal(gestionOrdenes.actualizarOrden(orden.id, { prioridad: 'alta' }).prioridad, 'alta')

  await esperarPersistencia()
  assert.equal(JSON.parse(localStorage.getItem('autoservice_clientes'))[0].nombre, 'Cliente QA modificado')
  assert.equal(JSON.parse(localStorage.getItem('autoservice_vehiculos'))[0].modelo, 'Focus modificado')
  assert.equal(JSON.parse(localStorage.getItem('autoservice_servicios'))[0].estado, 'completado')
  assert.equal(JSON.parse(localStorage.getItem('autoservice_ordenes'))[0].prioridad, 'alta')

  assert.equal(gestionOrdenes.eliminarOrden(orden.id), true)
  assert.equal(datos.eliminarServicio(servicio.id), true)
  assert.equal(datos.eliminarVehiculo(vehiculo.id), true)
  assert.equal(datos.eliminarCliente(cliente.id), true)
  assert.deepEqual(
    [datos.clientes.value, datos.vehiculos.value, datos.servicios.value, datos.ordenes.value].map((lista) => lista.length),
    [0, 0, 0, 0]
  )
})

await probar('DNI/CUIL opcional conserva ceros, acepta separadores y permite editar o borrar', async () => {
  const antiguo = datos.agregarCliente({ nombre: 'Sin documento' })
  assert.equal(antiguo.dniCuil, '')
  const cliente = datos.agregarCliente({ nombre: 'Documento QA', dniCuil: '01.234.567' })
  assert.equal(cliente.dniCuil, '01234567')
  const actualizado = datos.actualizarCliente(cliente.id, { dniCuil: '20-12345678-6' })
  assert.equal(actualizado.dniCuil, '20123456786')
  assert.equal(formatearDniCuil(actualizado.dniCuil), '20-12345678-6')
  assert.match(etiquetaCliente(actualizado), /Documento QA.*20-12345678-6/)
  await esperarPersistencia()
  const guardados = JSON.parse(localStorage.getItem('autoservice_clientes'))
  assert.equal(guardados[1].dniCuil, '20123456786')
  assert.equal(validarDatosAutoservice({ clientes: [{ id: 1, nombre: 'Cliente anterior' }], vehiculos: [], servicios: [], ordenes: [] }), true)
  assert.equal(datos.actualizarCliente(cliente.id, { nombre: 'Otro nombre' }).dniCuil, '20123456786')
  assert.equal(datos.actualizarCliente(cliente.id, { dniCuil: '' }).dniCuil, '')
})

await probar('DNI/CUIL inválido no modifica clientes y muestra error junto al campo', async () => {
  const validacion = useFormValidation()
  for (const valor of ['', '1234567', '12345678', '20-12345678-6']) {
    assert.equal(esDniCuilValido(valor), true)
    assert.equal(validacion.validateDniCuil(valor), true)
  }
  const cliente = datos.agregarCliente({ nombre: 'Con documento', dniCuil: '12345678' })
  for (const valor of ['123', '123456789', '123456789012', 'AB12345678', '<script>']) {
    assert.equal(validacion.validateDniCuil(valor), false)
    assert.match(validacion.getError('dniCuil'), /DNI.*CUIL/)
    assert.equal(datos.agregarCliente({ nombre: 'Rechazado', dniCuil: valor }), null)
    assert.equal(datos.actualizarCliente(cliente.id, { dniCuil: valor }), null)
    assert.equal(datos.obtenerClientePorId(cliente.id).dniCuil, '12345678')
  }
  assert.equal(datos.clientes.value.length, 1)
  assert.equal(validacion.validateDniCuil(''), true)
  assert.equal(validacion.getError('dniCuil'), '')
})

await probar('buscar clientes por DNI/CUIL funciona con y sin separadores', async () => {
  datos.agregarCliente({ nombre: 'DNI QA', dniCuil: '12345678' })
  datos.agregarCliente({ nombre: 'CUIL QA', dniCuil: '27111222334' })
  const paginacion = usePagination(datos.clientes)
  for (const consulta of ['12345678', '12.345.678']) {
    paginacion.searchQuery.value = consulta
    assert.equal(paginacion.paginatedItems.value[0].nombre, 'DNI QA')
  }
  for (const consulta of ['27111222334', '27-11122233-4']) {
    paginacion.searchQuery.value = consulta
    assert.equal(paginacion.paginatedItems.value[0].nombre, 'CUIL QA')
  }
})

await probar('los IDs permanecen únicos aunque dos altas ocurran en el mismo milisegundo', async () => {
  const dateNowOriginal = Date.now
  Date.now = () => 1_700_000_000_000
  try {
    datos.agregarCliente({ nombre: 'Cliente A', email: 'a@example.com', telefono: '1111111111' })
    datos.agregarCliente({ nombre: 'Cliente B', email: 'b@example.com', telefono: '2222222222' })
  } finally {
    Date.now = dateNowOriginal
  }

  const ids = datos.clientes.value.map((cliente) => cliente.id)
  assert.equal(new Set(ids).size, ids.length, `IDs duplicados detectados: ${ids.join(', ')}`)
})

await probar('el email de cliente no puede repetirse ignorando mayúsculas y espacios', async () => {
  datos.agregarCliente({ nombre: 'Cliente A', email: 'Cliente@Example.com', telefono: '1111111111' })
  datos.agregarCliente({ nombre: 'Cliente B', email: ' cliente@example.com ', telefono: '2222222222' })

  assert.equal(datos.clientes.value.length, 1, 'Se aceptó un email duplicado')
})

await probar('la patente no puede repetirse ignorando mayúsculas y separadores', async () => {
  const cliente = datos.agregarCliente({ nombre: 'Titular', email: 'titular@example.com', telefono: '1111111111' })
  datos.agregarVehiculo({ clienteId: cliente.id, marca: 'Ford', modelo: 'Focus', patente: 'AA123BB' })
  datos.agregarVehiculo({ clienteId: cliente.id, marca: 'Ford', modelo: 'Ka', patente: 'aa 123 bb' })

  assert.equal(datos.vehiculos.value.length, 1, 'Se aceptó una patente duplicada')
})

await probar('no se elimina un cliente que conserva vehículos asociados', async () => {
  const cliente = datos.agregarCliente({ nombre: 'Titular', email: 'titular@example.com', telefono: '1111111111' })
  datos.agregarVehiculo({ clienteId: cliente.id, marca: 'Ford', modelo: 'Focus', patente: 'AB123CD' })

  assert.equal(datos.eliminarCliente(cliente.id), false)
  assert.equal(datos.clientes.value.some((item) => item.id === cliente.id), true)
})

await probar('el cliente de un vehículo queda fijo desde el alta, incluso sin historial', async () => {
  const titular = datos.agregarCliente({ nombre: 'Titular original', email: 'original@example.com' })
  const otroCliente = datos.agregarCliente({ nombre: 'Otro cliente', email: 'otro@example.com' })
  const vehiculo = datos.agregarVehiculo({ clienteId: titular.id, marca: 'Ford', modelo: 'Focus', patente: 'AE123FG' })
  assert.equal(datos.actualizarVehiculo(vehiculo.id, { clienteId: otroCliente.id, modelo: 'No debe guardarse' }), null)
  assert.equal(datos.obtenerVehiculoPorId(vehiculo.id).clienteId, titular.id)
  assert.equal(datos.obtenerVehiculoPorId(vehiculo.id).modelo, 'Focus')
  assert.equal(datos.actualizarVehiculo(vehiculo.id, { modelo: 'Focus actualizado' }).modelo, 'Focus actualizado')
  assert.ok(datos.actualizarVehiculo(vehiculo.id, { clienteId: String(titular.id), color: 'Blanco' }))
  assert.equal(datos.obtenerVehiculoPorId(vehiculo.id).clienteId, titular.id)
  await esperarPersistencia()
  assert.equal(JSON.parse(localStorage.getItem('autoservice_vehiculos'))[0].clienteId, titular.id)
})

await probar('rechazar un cambio de titular conserva las relaciones de servicios y órdenes', async () => {
  const titular = datos.agregarCliente({ nombre: 'Titular original', email: 'original@example.com' })
  const otroCliente = datos.agregarCliente({ nombre: 'Otro cliente', email: 'otro@example.com' })
  const vehiculo = datos.agregarVehiculo({ clienteId: titular.id, marca: 'Ford', modelo: 'Focus', patente: 'AF123GH' })
  datos.agregarServicio({ clienteId: titular.id, vehiculoId: vehiculo.id, tipoServicio: 'General', fechaServicio: '2026-10-06' })
  gestionOrdenes.crearOrden({ clienteId: titular.id, vehiculoId: vehiculo.id, descripcionTrabajo: 'Trabajo registrado' })
  const antes = JSON.parse(JSON.stringify({
    clientes: datos.clientes.value, vehiculos: datos.vehiculos.value,
    servicios: datos.servicios.value, ordenes: datos.ordenes.value
  }))
  assert.equal(datos.actualizarVehiculo(vehiculo.id, { clienteId: otroCliente.id }), null)
  const despues = {
    clientes: datos.clientes.value, vehiculos: datos.vehiculos.value,
    servicios: datos.servicios.value, ordenes: datos.ordenes.value
  }
  assert.deepEqual(despues, antes)
  assert.equal(validarDatosAutoservice(despues), true)
})

await probar('no se elimina un vehículo que conserva servicios asociados', async () => {
  const cliente = datos.agregarCliente({ nombre: 'Titular', email: 'titular@example.com', telefono: '1111111111' })
  const vehiculo = datos.agregarVehiculo({ clienteId: cliente.id, marca: 'Ford', modelo: 'Focus', patente: 'AC123DE' })
  datos.agregarServicio({
    clienteId: cliente.id,
    vehiculoId: vehiculo.id,
    tipoServicio: 'Prueba',
    fechaServicio: '2026-09-25',
    estado: 'pendiente'
  })

  assert.equal(datos.eliminarVehiculo(vehiculo.id), false)
  assert.equal(datos.vehiculos.value.some((item) => item.id === vehiculo.id), true)
})

await probar('no se elimina un vehículo que conserva órdenes asociadas', async () => {
  const cliente = datos.agregarCliente({ nombre: 'Titular', email: 'titular@example.com', telefono: '1111111111' })
  const vehiculo = datos.agregarVehiculo({ clienteId: cliente.id, marca: 'Ford', modelo: 'Focus', patente: 'AD123EF' })
  gestionOrdenes.crearOrden({ clienteId: cliente.id, vehiculoId: vehiculo.id, descripcionTrabajo: 'Orden vinculada' })

  assert.equal(datos.eliminarVehiculo(vehiculo.id), false)
  assert.equal(datos.vehiculos.value.some((item) => item.id === vehiculo.id), true)
})

await probar('la validación de recuperación rechaza registros incompletos y relaciones huérfanas', async () => {
  assert.equal(validarDatosAutoservice({
    clientes: [{}],
    vehiculos: [],
    servicios: [],
    ordenes: []
  }), false, 'Se aceptó un cliente sin campos mínimos')

  assert.equal(validarDatosAutoservice({
    clientes: [],
    vehiculos: [],
    servicios: [{
      id: 1,
      clienteId: 999,
      vehiculoId: 999,
      tipoServicio: 'Prueba',
      fechaServicio: '2026-09-25',
      estado: 'pendiente'
    }],
    ordenes: []
  }), false, 'Se aceptó un servicio con relaciones huérfanas')
})

for (const resultado of resultados) {
  if (resultado.ok) {
    process.stdout.write(`✓ ${resultado.nombre}\n`)
  } else {
    process.stderr.write(`✗ ${resultado.nombre}\n  ${resultado.error.message}\n`)
  }
}

const fallos = resultados.filter((resultado) => !resultado.ok)
process.stdout.write(`\n${resultados.length - fallos.length}/${resultados.length} pruebas superadas\n`)
process.exit(fallos.length === 0 ? 0 : 1)
