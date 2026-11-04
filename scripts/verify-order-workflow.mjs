import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { parse, compileScript } from '@vue/compiler-sfc'
import 'fake-indexeddb/auto'

// Solo datos sintéticos y almacenamientos en memoria. Nunca abre WhatsApp real.
class MemoryStorage {
  data = new Map()
  fail = false
  getItem(key) { if (this.fail) throw Error('Sesión bloqueada'); return this.data.get(key) ?? null }
  setItem(key, value) { if (this.fail) throw Error('Sesión bloqueada'); this.data.set(key, String(value)) }
  removeItem(key) { if (this.fail) throw Error('Sesión bloqueada'); this.data.delete(key) }
}
globalThis.localStorage = new MemoryStorage()
globalThis.sessionStorage = new MemoryStorage()
globalThis.confirm = () => true
const opened = []
globalThis.window = { location: { reload() {} }, open: (...args) => { opened.push(args) } }
const compiled = await build({
  stdin: { contents: [
    "export {useAutoService} from './src/composables/useAutoService.js'",
    "export {useBorradorOrden} from './src/composables/useBorradorOrden.js'",
    "export {useDiskStorage} from './src/composables/useDiskStorage.js'",
    "export * from './src/utils/compartirOrden.js'",
    "export {default as OrdenesView} from './src/views/OrdenesMantenimiento.vue'",
    "export {default as CompartirView} from './src/components/CompartirOrdenWhatsApp.vue'",
    "export {createSSRApp, h, nextTick} from 'vue'",
    "export {renderToString} from '@vue/server-renderer'",
    "export {createRouter, createMemoryHistory} from 'vue-router'"
  ].join('\n'), resolveDir: process.cwd() },
  bundle: true, format: 'esm', platform: 'node', write: false,
  define: { 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '"qa-sin-google"' },
  plugins: [{ name: 'order-workflow-vue', setup(builder) {
    builder.onLoad({ filter: /\.vue$/ }, ({ path }) => {
      if (!/[/\\](OrdenesMantenimiento|CompartirOrdenWhatsApp)\.vue$/.test(path)) return { contents: 'export default {}', loader: 'js' }
      const { descriptor } = parse(readFileSync(path, 'utf8'))
      return { contents: compileScript(descriptor, { id: 'order-workflow-qa' }).content, loader: 'js' }
    })
  } }]
})
const moduleURL = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`
const mod = await import(moduleURL)
const app = mod.useAutoService()
await app.inicializacionDatos
const draft = mod.useBorradorOrden()
const view = async (component = mod.OrdenesView, props = {}) => {
  let setup
  const screen = mod.createSSRApp({ setup() { setup = component.setup(props, { expose() {}, emit() {} }); return () => mod.h('div') } })
  screen.use(mod.createRouter({ history: mod.createMemoryHistory('/'), routes: [{ path: '/', component: {} }] }))
  await mod.renderToString(screen)
  return setup
}
let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log(`✓ ${name}`) }
const client = app.agregarCliente({ nombre: 'Cliente de prueba', telefono: '+54 9 11 5555 1234', dniCuil: '12345678' })
const car = app.agregarVehiculo({ clienteId: client.id, marca: 'Ford', modelo: 'QA', patente: 'QA123BC' })
const car2 = app.agregarVehiculo({ clienteId: client.id, marca: 'Fiat', modelo: 'QA', patente: 'QA456BC' })
let form = await view()
await check('cerrar y volver a Órdenes conserva el borrador sin crear registros', async () => {
  form.abrirNuevaOrden()
  form.formulario.value = { ...form.formulario.value, vehiculoId: car.id, clienteId: client.id, descripcionTrabajo: 'Primer texto copiado', observaciones: 'Notas conservadas', costoEstimado: 1000 }
  form.cancelarFormulario()
  assert.equal(form.mostrarFormulario.value, false)
  form = await view() // Nueva instancia de la vista, mismo estado de sesión.
  assert.equal(form.borradorActivo.value, true)
  form.reanudarBorrador()
  assert.equal(form.formulario.value.descripcionTrabajo, 'Primer texto copiado')
  assert.equal(form.formulario.value.observaciones, 'Notas conservadas')
  assert.equal(app.ordenes.value.length, 0)
})
await check('una recarga recupera el borrador y no lo confunde con una orden guardada', async () => {
  const reload = await import(`${moduleURL}#recarga`)
  const recovered = reload.useBorradorOrden()
  assert.equal(recovered.activo.value, true)
  assert.equal(recovered.formulario.value.descripcionTrabajo, 'Primer texto copiado')
  assert.equal(recovered.formulario.value.observaciones, 'Notas conservadas')
  assert.equal(recovered.ordenId.value, null)
})
await check('si sessionStorage falla se conserva el borrador en memoria y se advierte', async () => {
  sessionStorage.fail = true
  form.formulario.value.observaciones = 'Notas aun con sesión bloqueada'
  assert.equal(draft.sesionDisponible.value, false)
  form.cancelarFormulario()
  form = await view()
  assert.equal(form.formulario.value.observaciones, 'Notas aun con sesión bloqueada')
  sessionStorage.fail = false
  form.formulario.value.observaciones = 'Notas conservadas'
  assert.equal(draft.sesionDisponible.value, true)
})
const service = app.agregarServicio({ clienteId: client.id, vehiculoId: car.id, fechaServicio: '2026-11-03', tipoServicio: 'Mantenimiento general', descripcion: 'Cambio de aceite y filtros', observaciones: 'Nota del servicio', costo: 5000, estado: 'completado' })
const otherService = app.agregarServicio({ clienteId: client.id, vehiculoId: car2.id, fechaServicio: '2026-11-03', tipoServicio: 'Frenos', descripcion: 'Otro auto', estado: 'completado' })
await check('traer un servicio agrega descripción y notas sin pisar texto, estado ni presupuesto', () => {
  assert.deepEqual(form.serviciosDelVehiculo.value.map(s => s.id), [service.id])
  form.servicioOrigenId.value = service.id
  form.traerServicio()
  assert.equal(form.formulario.value.descripcionTrabajo, 'Primer texto copiado\n\nCambio de aceite y filtros')
  assert.equal(form.formulario.value.observaciones, 'Notas conservadas\n\nNota del servicio')
  assert.equal(form.formulario.value.costoEstimado, 1000)
  assert.equal(form.formulario.value.estado, 'pendiente')
  form.servicioOrigenId.value = service.id; form.traerServicio()
  assert.equal(form.formulario.value.descripcionTrabajo.match(/Cambio de aceite/g).length, 1)
})
await check('no incorpora por error información de otro vehículo', () => {
  const before = JSON.stringify(form.formulario.value)
  form.servicioOrigenId.value = otherService.id
  form.traerServicio()
  assert.equal(JSON.stringify(form.formulario.value), before)
})
await check('solo un guardado exitoso crea la orden y retira el borrador', async () => {
  await form.guardarOrden()
  assert.equal(app.ordenes.value.length, 1)
  assert.match(app.ordenes.value[0].descripcionTrabajo, /Cambio de aceite/)
  assert.equal(draft.activo.value, false)
  assert.equal(sessionStorage.getItem('brabus_borrador_orden_v1'), null)
})
let order = app.ordenes.value[0]
await check('un guardado en curso no permite cambiar el borrador por el de otra orden', () => {
  const before = JSON.stringify(draft.formulario.value)
  const disk = mod.useDiskStorage()
  disk.guardando.value = true
  form.editarOrden(order)
  form.abrirNuevaOrden()
  assert.equal(JSON.stringify(draft.formulario.value), before)
  assert.equal(draft.activo.value, false)
  disk.guardando.value = false
})
await check('editar preserva fotos y fecha original y el borrador no almacena adjuntos antiguos', async () => {
  const fechaOriginal = order.fechaCreacion
  app.actualizarOrden(order.id, { imagenes: [{ fileId: 'foto-original' }] })
  form.editarOrden(app.ordenes.value[0])
  form.formulario.value.descripcionTrabajo += '\nDetalle ampliado'
  assert.equal('imagenes' in JSON.parse(sessionStorage.getItem('brabus_borrador_orden_v1')).formulario, false)
  app.actualizarOrden(order.id, { imagenes: [{ fileId: 'foto-nueva' }] })
  await form.guardarOrden()
  order = app.ordenes.value[0]
  assert.deepEqual(order.imagenes, [{ fileId: 'foto-nueva' }])
  assert.equal(order.fechaCreacion, fechaOriginal)
  assert.match(order.descripcionTrabajo, /Detalle ampliado/)
})
await check('un borrador viejo nunca pisa una orden modificada o eliminada mientras tanto', async () => {
  form.editarOrden(order)
  form.formulario.value.descripcionTrabajo = 'Borrador anterior'
  app.actualizarOrden(order.id, { descripcionTrabajo: 'Cambio más reciente confirmado' })
  await form.guardarOrden()
  assert.equal(app.ordenes.value[0].descripcionTrabajo, 'Cambio más reciente confirmado')
  assert.equal(draft.activo.value, true)
  app.eliminarOrden(order.id)
  await form.guardarOrden()
  assert.equal(app.ordenes.value.length, 0)
  assert.equal(form.formulario.value.descripcionTrabajo, 'Borrador anterior')
})
await check('descartar exige confirmación y nunca borra órdenes guardadas', () => {
  const saved = app.agregarOrden({ clienteId: client.id, vehiculoId: car.id, numeroOrden: 'OM-QA-CONSERVADA', descripcionTrabajo: 'Orden que debe conservarse' })
  const before = JSON.stringify(app.ordenes.value)
  globalThis.confirm = () => false
  form.descartarFormulario()
  assert.equal(draft.activo.value, true)
  globalThis.confirm = () => true
  form.descartarFormulario()
  assert.equal(draft.activo.value, false)
  assert.equal(sessionStorage.getItem('brabus_borrador_orden_v1'), null)
  assert.equal(JSON.stringify(app.ordenes.value), before)
  app.eliminarOrden(saved.id)
})
await check('un guardado rechazado conserva el formulario y el borrador', async () => {
  form.abrirNuevaOrden()
  form.formulario.value = { ...form.formulario.value, clienteId: client.id, vehiculoId: car.id, descripcionTrabajo: 'Trabajo no guardado', costoEstimado: -1 }
  await form.guardarOrden()
  assert.equal(form.mostrarFormulario.value, true)
  assert.equal(draft.activo.value, true)
  assert.equal(form.formulario.value.descripcionTrabajo, 'Trabajo no guardado')
  assert.equal(app.ordenes.value.length, 0)
  form.descartarFormulario()
})
const shared = { ...order, cliente: { ...client, email: 'privado@example.com' }, vehiculo: car, estado: 'completada', observaciones: 'Nota interna privada', costoEstimado: 12345, googleDriveLink: 'https://drive.google.com/privado' }
const original = JSON.stringify(shared)
let preview = await view(mod.CompartirView, { orden: shared })
await check('la vista previa incluye trabajo y vehículo pero no notas internas, DNI/CUIL, importes ni enlaces privados', () => {
  assert.match(preview.mensaje.value, /Detalle ampliado/)
  assert.match(preview.mensaje.value, /QA123BC/)
  assert.doesNotMatch(preview.mensaje.value, /Nota interna privada|12345678|12345|drive\.google|privado@example/)
  assert.equal(opened.length, 0)
})
await check('el operador puede editar el mensaje e incluir observaciones e importe explícitamente', () => {
  preview.mensaje.value = 'Texto revisado por el taller'
  preview.agregarNotas(); preview.agregarImporte()
  assert.match(preview.mensaje.value, /^Texto revisado por el taller/)
  assert.match(preview.mensaje.value, /Nota interna privada/)
  assert.match(preview.mensaje.value, /Presupuesto estimado \(no es comprobante de pago\)/)
  assert.equal(JSON.stringify(shared), original)
})
await check('teléfono o mensaje inválidos muestran el error sin abrir WhatsApp', () => {
  for (const phone of ['', 'GH45', '1234', '+54 12345']) {
    preview.telefono.value = phone; preview.abrir()
    assert.match(preview.errorMensaje.value, /teléfono válido/)
  }
  preview.telefono.value = '+54 9 11 5555 1234'
  preview.mensaje.value = ''; preview.abrir()
  assert.match(preview.errorMensaje.value, /Escribí el mensaje/)
  preview.mensaje.value = 'x'.repeat(4001); preview.abrir()
  assert.match(preview.errorMensaje.value, /4000 caracteres/)
  assert.equal(opened.length, 0)
})
await check('solo el clic explícito prepara el chat con el texto exacto, sin enviar ni modificar la orden', () => {
  preview.mensaje.value = 'Trabajo revisado: aceite & filtros\nObservación: ¿todo bien? 🔧'
  preview.telefono.value = '11 5555-1234'
  preview.abrir()
  assert.equal(opened.length, 1)
  const url = new URL(opened[0][0])
  assert.equal(url.origin, 'https://wa.me')
  assert.equal(url.pathname, '/5491155551234')
  assert.equal(url.searchParams.get('text'), preview.mensaje.value)
  assert.equal(opened[0][2], 'noopener,noreferrer')
  assert.equal(JSON.stringify(shared), original)
  assert.equal(preview.chatPreparado.value, true)
})
console.log(`${checks}/${checks} pruebas de borradores y WhatsApp superadas`)
