import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { parse, compileScript } from '@vue/compiler-sfc'
import { parse as leerCSV } from 'csv-parse/sync'
import { JSDOM } from 'jsdom'
import 'fake-indexeddb/auto'

// DOM simulado, API de disco en memoria y Drive simulado: jamás usa los datos
// del taller, el perfil de Chrome, conexiones de Google ni envíos de WhatsApp.
const dom = new JSDOM('<body><nav><button id="navigation">Navegación QA</button></nav><div id="screen"></div></body>', { url: 'http://qa.invalid/' })
for (const key of ['window', 'document', 'history', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'Event', 'KeyboardEvent', 'FileReader', 'File', 'localStorage', 'sessionStorage']) globalThis[key] = dom.window[key]
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
// jsdom no calcula geometría. Esta prueba verifica teclado y DOM, NO píxeles.
dom.window.HTMLElement.prototype.getClientRects = function () {
  return this.closest('[hidden], .hidden') ? [] : [{ width: 100, height: 20 }]
}
globalThis.confirm = () => true
globalThis.alert = () => {}
window.checkGoogleLibraries = () => true
const opened = []
window.open = (...args) => { opened.push(args); return null }
window.HTMLAnchorElement.prototype.click = function () {}
let blobCSV
URL.createObjectURL = blob => { blobCSV = blob; return 'blob:qa' }
URL.revokeObjectURL = () => {}
const descripcion = 'Revisar "freno", filtro\r\nSegunda línea\nTercera línea'
let state = {
  initialized: true, revision: 1, fecha: '2026-11-03T18:00:00Z', directory: 'memoria-qa',
  datos: {
    clientes: [{ id: 1, nombre: 'Cliente "QA", sintético', telefono: '1155551234', email: '', fechaCreacion: '2026-11-03' }],
    vehiculos: [{ id: 2, clienteId: 1, marca: 'Marca QA', modelo: 'Modelo QA', patente: 'QA123BC', anio: 2020 }],
    servicios: [{ id: 3, clienteId: 1, vehiculoId: 2, tipoServicio: 'Diagnóstico', fechaServicio: '2026-11-03', proximoServicio: '2027-11-03', costo: 0, estado: 'completado', descripcion, observaciones: descripcion }],
    ordenes: [{ id: 4, numeroOrden: 'QA-0001', clienteId: 1, vehiculoId: 2, descripcionTrabajo: 'Descripción guardada', observaciones: '', costoEstimado: 0, estado: 'completada', prioridad: 'media', fechaCreacion: '2026-11-03', imagenes: [] }]
  }
}
let escrituras = 0
globalThis.fetch = async (url, options) => {
  assert.equal(url, '/api/taller/state', 'no se permiten solicitudes externas en esta prueba')
  if (options?.method === 'PUT') {
    const body = JSON.parse(options.body)
    assert.equal(body.expectedRevision, state.revision)
    escrituras++
    state = { ...state, datos: body.datos, revision: state.revision + 1 }
  }
  return { ok: true, json: async () => structuredClone(state) }
}
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: [
    "export {createApp, h, nextTick} from 'vue'",
    "export {createRouter, createMemoryHistory} from 'vue-router'",
    "export {focusTrap} from './src/directives/focusTrap.js'",
    "export {useAutoService} from './src/composables/useAutoService.js'",
    "export {useBorradorOrden} from './src/composables/useBorradorOrden.js'",
    "export {useReports} from './src/composables/useReports.js'",
    "export {useBackupSystem} from './src/composables/useBackupSystem.js'",
    "export {useProximosServicios} from './src/composables/useProximosServicios.js'",
    "export {useNotifications} from './src/composables/useNotifications.js'",
    "export {usePDF} from './src/composables/usePDF.js'",
    "export {driveQA} from './src/composables/useGoogleDrive.js'",
    "export {default as Ordenes} from './src/views/OrdenesMantenimiento.vue'",
    "export {default as Clientes} from './src/views/Clientes.vue'",
    "export {default as Servicios} from './src/views/Servicios.vue'",
    "export {default as Reportes} from './src/views/Reportes.vue'"
  ].join('\n') },
  bundle: true, format: 'esm', platform: 'node', write: false,
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '"qa-no-google"' },
  plugins: [{ name: 'qa-dom', setup(builder) {
    builder.onLoad({ filter: /useGoogleDrive\.js$/ }, () => ({ loader: 'js', contents: `
      import {ref} from 'vue'
      export const driveQA = {connected: ref(false), uploads: 0}
      export const useGoogleDrive = () => ({
        estaAutenticado: () => driveQA.connected.value,
        isAuthenticated: driveQA.connected,
        initializeGoogleDrive: async () => false,
        authenticateUser: async () => false,
        getDebugInfo: () => ({}),
        subirImagen: async () => {driveQA.uploads++; return {success: true, fileId: 'foto-qa', fileName: 'qa.png'} }
      })
    ` }))
    builder.onLoad({ filter: /\.vue$/ }, ({ path }) => {
      const { descriptor } = parse(readFileSync(path, 'utf8'))
      return { loader: 'js', contents: compileScript(descriptor, { id: path, inlineTemplate: true }).content }
    })
  } }]
})
const mod = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`)
const data = mod.useAutoService()
await data.inicializacionDatos
assert.equal(data.datosListos.value, true)
const tick = async () => { await mod.nextTick(); await new Promise(resolve => setTimeout(resolve, 10)); await mod.nextTick() }
const uiErrors = []
let ui
const mount = async component => {
  ui?.unmount()
  ui = mod.createApp(component)
  ui.directive('focus-trap', mod.focusTrap)
  ui.config.errorHandler = error => uiErrors.push(error)
  const router = mod.createRouter({ history: mod.createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: {} }] })
  ui.use(router)
  await router.push('/')
  await router.isReady()
  ui.mount('#screen')
  await tick()
}
const button = (text, root = document) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === text)
const input = async (selector, value, kind = 'input') => {
  const field = document.querySelector(selector)
  assert.ok(field, selector)
  field.value = value
  field.dispatchEvent(new Event(kind, { bubbles: true }))
  await tick()
}
const tab = shiftKey => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }))
let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log(`✓ ${name}`) }
const parseCSV = csv => leerCSV(csv, { bom: true, columns: true, relax_quotes: false, relax_column_count: false })

const conClientesDeBusqueda = async comprobar => {
  const original = structuredClone(state.datos)
  try {
    mod.useBorradorOrden().descartar()
    const martin = await data.agregarCliente({ nombre: 'Martín Gómez', dniCuil: '12345678' })
    const homonimo = await data.agregarCliente({ nombre: 'Martin Pérez', dniCuil: '87654321' })
    const sinAuto = await data.agregarCliente({ nombre: 'Lucía Sin Auto' })
    const uno = await data.agregarVehiculo({ clienteId: martin.id, marca: 'Ford', modelo: 'QA Uno', patente: 'BUS001' })
    const dos = await data.agregarVehiculo({ clienteId: homonimo.id, marca: 'Fiat', modelo: 'QA Dos', patente: 'BUS002' })
    const tres = await data.agregarVehiculo({ clienteId: homonimo.id, marca: 'Ford', modelo: 'QA Tres', patente: 'BUS003' })
    await mount(mod.Ordenes)
    button('Nueva Orden').click()
    await tick()
    await comprobar({ martin, homonimo, sinAuto, uno, dos, tres, escriturasAntes: escrituras })
  } finally {
    mod.useBorradorOrden().descartar()
    ui?.unmount(); ui = undefined
    await data.reemplazarDatos(original, { action: 'restauracion' })
  }
}

try {
  await check('buscar cliente muestra coincidencias visibles sin distinguir tildes y permite elegir sin guardar', () => conClientesDeBusqueda(async ({ martin, homonimo, uno, escriturasAntes }) => {
    await input('#order-description', 'Borrador que no debe guardarse al buscar')
    await input('#order-client-search', 'mArTiN')
    const resultados = () => [...document.querySelectorAll('#order-client-results button')]
    assert.equal(resultados().length, 2)
    assert.match(resultados()[0].textContent, /Martín Gómez.*12345678/)
    assert.match(resultados()[1].textContent, /Martin Pérez.*87654321/)
    assert.equal(document.querySelector('#order-client').value, '', 'buscar no elige arbitrariamente un homónimo')
    resultados()[0].click()
    await tick()
    assert.equal(document.querySelector('#order-client').value, String(martin.id))
    assert.equal(document.querySelector('#order-vehicle').value, String(uno.id))
    assert.equal(document.activeElement.id, 'order-vehicle')
    assert.equal(document.querySelector('#order-client-results'), null)
    await input('#order-client-search', 'PÉREZ')
    assert.equal(resultados().length, 1, 'el seleccionado anterior no es una coincidencia falsa')
    assert.match(resultados()[0].textContent, /Martin Pérez/)
    assert.equal(document.querySelector('#order-client').value, String(martin.id), 'buscar no cambia el cliente hasta elegir')
    resultados()[0].click()
    await tick()
    assert.equal(document.querySelector('#order-client').value, String(homonimo.id))
    assert.equal(document.querySelector('#order-vehicle').value, '', 'varios vehículos requieren elegir uno')
    assert.equal(document.querySelector('#order-description').value, 'Borrador que no debe guardarse al buscar')
    assert.equal(escrituras, escriturasAntes)
    assert.equal(data.ordenes.value.length, 1)
  }))

  await check('DNI con separadores, clientes con varios o sin vehículos y selector nativo conservan relaciones', () => conClientesDeBusqueda(async ({ martin, homonimo, sinAuto, dos, tres, escriturasAntes }) => {
    await input('#order-client-search', '87.654.321')
    const search = document.querySelector('#order-client-search')
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await tick()
    assert.equal(document.querySelector('#order-client').value, String(homonimo.id))
    assert.deepEqual([...document.querySelector('#order-vehicle').options].map(o => o.value), ['', String(dos.id), String(tres.id)])
    await input('#order-vehicle', String(dos.id), 'change')
    await input('#order-client-search', 'lucia')
    document.querySelector('#order-client-results button').click()
    await tick()
    assert.equal(document.querySelector('#order-client').value, String(sinAuto.id))
    assert.equal(document.querySelector('#order-vehicle').value, '')
    assert.equal(document.querySelector('#order-vehicle').options.length, 1)
    assert.match(document.querySelector('.order-dialog').textContent, /Este cliente no tiene vehículos/)
    await input('#order-client', String(martin.id), 'change')
    assert.equal(document.querySelector('#order-client').value, String(martin.id), 'se conserva la elección por el selector de siempre')
    assert.notEqual(document.querySelector('#order-vehicle').value, '')
    assert.equal(escrituras, escriturasAntes)
  }))

  await check('flechas y Enter permiten elegir; búsqueda sin resultados y Escape no guardan ni descartan el borrador', () => conClientesDeBusqueda(async ({ escriturasAntes }) => {
    await input('#order-description', 'Conservar al cerrar la búsqueda')
    await input('#order-client-search', 'martin')
    const search = document.querySelector('#order-client-search')
    search.focus()
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await tick()
    const resultados = [...document.querySelectorAll('#order-client-results button')]
    assert.equal(document.activeElement, resultados[0])
    assert.equal(document.querySelector('#order-client').value, '')
    resultados[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    assert.equal(document.activeElement, resultados[1])
    resultados[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))
    assert.equal(document.activeElement, resultados[0])
    search.focus()
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    assert.equal(document.activeElement, resultados[0])
    await input('#order-client-search', 'nombre inexistente QA')
    assert.equal(document.querySelector('#order-client-results'), null)
    assert.match(document.querySelector('#order-client-search-status').textContent, /No se encontraron clientes/)
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    search.dispatchEvent(enter)
    assert.equal(enter.defaultPrevented, true)
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await tick()
    assert.ok(document.querySelector('.order-dialog'), 'el primer Escape cierra solo la búsqueda')
    assert.equal(search.value, '')
    assert.equal(document.querySelector('#order-description').value, 'Conservar al cerrar la búsqueda')
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await tick()
    assert.equal(document.querySelector('.order-dialog'), null)
    assert.equal(mod.useBorradorOrden().formulario.value.descripcionTrabajo, 'Conservar al cerrar la búsqueda')
    assert.equal(escrituras, escriturasAntes)
  }))

  await check('selección dentro-fuera no cierra Editar Orden; clic exterior y Escape conservan borrador', async () => {
    await mount(mod.Ordenes)
    document.querySelector('[title="Editar orden"]').click()
    await tick()
    await input('#order-description', 'Selección QA sin guardar')
    const dialog = document.querySelector('.order-dialog')
    const backdrop = dialog.parentElement
    const field = document.querySelector('#order-description')
    const pointer = (node, type) => node.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0 }))
    const writesBefore = escrituras
    pointer(field, 'pointerdown')
    field.setSelectionRange(0, 9)
    pointer(field, 'pointerup')
    field.click()
    await tick()
    assert.ok(document.querySelector('.order-dialog'), 'selección interior permanece abierta')
    pointer(field, 'pointerdown')
    pointer(backdrop, 'pointerup')
    // Un gesto con extremos distintos puede generar click en su ancestro común.
    backdrop.click()
    await tick()
    assert.ok(document.querySelector('.order-dialog'), 'arrastrar dentro-fuera no debe cerrar')
    assert.equal(field.value, 'Selección QA sin guardar')
    pointer(backdrop, 'pointerdown')
    pointer(backdrop, 'pointerup')
    backdrop.click()
    await tick()
    assert.equal(document.querySelector('.order-dialog'), null, 'clic genuino fuera cierra')
    button('Continuar borrador').click()
    await tick()
    assert.equal(document.querySelector('#order-description').value, 'Selección QA sin guardar')
    document.querySelector('#order-description').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await tick()
    assert.equal(document.querySelector('.order-dialog'), null)
    assert.equal(escrituras, writesBefore, 'seleccionar o cerrar no guarda la orden')
    button('Continuar borrador').click()
    await tick()
    button('Descartar borrador').click()
    await tick()
  })
  await check('Agregar Foto con Drive desconectado no envía el formulario ni cierra el borrador', async () => {
    await mount(mod.Ordenes)
    document.querySelector('[title="Editar orden"]').click()
    await tick()
    await input('#order-description', 'Modificación todavía NO guardada')
    let selecciones = 0
    document.querySelector('input[type="file"]').click = () => { selecciones++ }
    const antes = escrituras
    button('Agregar Foto').click()
    await tick()
    assert.equal(selecciones, 1)
    assert.equal(escrituras, antes)
    assert.ok(document.querySelector('#order-description'))
    assert.equal(data.ordenes.value[0].descripcionTrabajo, 'Descripción guardada')
    assert.equal(mod.useBorradorOrden().formulario.value.descripcionTrabajo, 'Modificación todavía NO guardada')
    const file = document.querySelector('input[type="file"]')
    Object.defineProperty(file, 'files', { configurable: true, value: [new File(['qa'], 'qa.png', { type: 'image/png' })] })
    file.dispatchEvent(new Event('change', { bubbles: true }))
    await tick()
    assert.equal(escrituras, antes)
    assert.equal(mod.driveQA.uploads, 0)
    assert.ok(mod.useNotifications().notifications.value.some(n => /Drive no está disponible/.test(n.message)))
    assert.equal(document.querySelectorAll('.order-dialog button[type="submit"]').length, 1)
    assert.ok([...document.querySelectorAll('.order-dialog button')].every(b => b.hasAttribute('type')))
  })

  await check('subir una foto guarda solo el adjunto; conserva descripción original y borrador sin cerrar', async () => {
    mod.driveQA.connected.value = true
    const antes = escrituras
    const file = document.querySelector('input[type="file"]')
    file.dispatchEvent(new Event('change', { bubbles: true }))
    for (let i = 0; i < 20 && !document.querySelector('#modal-subida'); i++) await tick()
    const modal = document.querySelector('#modal-subida')
    assert.ok(modal)
    assert.equal(document.activeElement.id, 'descripcion-input')
    document.querySelector('#btn-subir').focus(); tab(false)
    assert.equal(document.activeElement.id, 'descripcion-input')
    tab(true)
    assert.equal(document.activeElement.id, 'btn-subir')
    assert.ok([...modal.querySelectorAll('button')].every(b => b.type === 'button'))
    assert.equal(escrituras, antes)
    await window.confirmarSubidaModal()
    await tick()
    assert.equal(escrituras, antes + 1)
    assert.equal(mod.driveQA.uploads, 1)
    assert.deepEqual(data.ordenes.value[0].imagenes.map(f => f.fileId), ['foto-qa'])
    assert.equal(data.ordenes.value[0].descripcionTrabajo, 'Descripción guardada')
    assert.equal(document.querySelector('#order-description').value, 'Modificación todavía NO guardada')
    assert.ok([...document.querySelectorAll('.order-dialog button')].every(b => b.hasAttribute('type')))
    assert.equal(document.querySelector('#modal-subida'), null)
    button('Continuar después').click()
    await tick()
    assert.equal(document.querySelector('#order-description'), null)
    assert.equal(mod.useBorradorOrden().hayCambios.value, true)
  })

  await check('Nuevo Cliente recibe foco, contiene Tab y Shift+Tab, y devuelve el foco al cerrar', async () => {
    await mount(mod.Clientes)
    const nuevo = button('Nuevo Cliente')
    nuevo.focus(); nuevo.click()
    await tick()
    const primero = document.querySelector('#client-name')
    assert.equal(document.activeElement, primero)
    const ultimo = document.querySelector('[aria-labelledby="client-form-title"] button[type="submit"]')
    ultimo.focus(); tab(false)
    assert.equal(document.activeElement, primero)
    tab(true)
    assert.equal(document.activeElement, ultimo)
    document.querySelector('#navigation').focus(); tab(false)
    assert.equal(document.activeElement, primero)
    button('Cancelar').click()
    await tick()
    assert.equal(document.activeElement, nuevo)
  })

  await check('Servicios conserva edición y detalle al arrastrar fuera; fondo, Cancelar y Escape cierran', async () => {
    await mount(mod.Servicios)
    const pointer = (node, type) => node.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0 }))
    const antes = escrituras
    for (const detalle of [false, true]) {
      document.querySelector(detalle ? '[title="Ver detalle del servicio"]' : '[title="Editar servicio"]').click()
      await tick()
      const selector = detalle ? '[aria-labelledby="service-detail-title"]' : '[aria-labelledby="service-form-title"]'
      const dialog = document.querySelector(selector)
      const fondo = dialog.parentElement
      const inicio = detalle ? dialog.querySelector('h2') : document.querySelector('#service-description')
      pointer(inicio, 'pointerdown'); pointer(fondo, 'pointerup'); fondo.click()
      await tick()
      assert.ok(document.querySelector(selector), 'seleccionar y soltar fuera conserva '+selector)
      pointer(fondo, 'pointerdown'); pointer(fondo, 'pointerup'); fondo.click()
      await tick()
      assert.equal(document.querySelector(selector), null, 'clic genuino fuera cierra')
    }
    document.querySelector('[title="Editar servicio"]').click(); await tick()
    button('Cancelar').click(); await tick()
    assert.equal(document.querySelector('#service-description'), null)
    document.querySelector('[title="Editar servicio"]').click(); await tick()
    document.querySelector('#service-description').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await tick()
    assert.equal(document.querySelector('#service-description'), null)
    assert.equal(escrituras, antes, 'selección y cancelaciones no escriben datos')
  })
  await check('editar y guardar un servicio de costo cero conserva el cero visible y almacenado', async () => {
    await mount(mod.Servicios)
    document.querySelector('[title="Editar servicio"]').click()
    await tick()
    const costo = document.querySelector('#service-cost')
    assert.equal(costo.value, '0')
    assert.equal(costo.validity.valid, true)
    button('Actualizar').click()
    await tick()
    assert.equal(data.servicios.value[0].costo, 0)
    assert.equal(document.querySelector('#service-cost'), null)
  })

  await check('próxima fecha anterior se explica y no se guarda ni desde UI ni desde CRUD', async () => {
    document.querySelector('[title="Editar servicio"]').click()
    await tick()
    await input('#service-next-date', '2026-11-02')
    const antes = escrituras
    assert.match(document.querySelector('#service-next-date-error').textContent, /no puede ser anterior/)
    assert.equal(document.querySelector('#service-next-date').min, '2026-11-03')
    document.querySelector('[aria-labelledby="service-form-title"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
    assert.equal(escrituras, antes)
    assert.equal(await data.actualizarServicio(3, { proximoServicio: '2026-11-02' }), null)
    assert.equal(await data.agregarServicio({ ...state.datos.servicios[0], proximoServicio: '2026-11-02' }), null)
    assert.equal(await data.actualizarServicio(3, { proximoServicio: '2026-02-30' }), null)
    assert.equal(escrituras, antes)
    assert.equal(data.servicios.value[0].proximoServicio, '2027-11-03')
    assert.ok(await data.actualizarServicio(3, { proximoServicio: '2026-11-03' }))
    assert.ok(await data.actualizarServicio(3, { proximoServicio: null }))
    assert.ok(await data.actualizarServicio(3, { proximoServicio: '2027-11-03' }))
  })

  await check('un período invertido no se presenta como actividad cero ni permite exportar', async () => {
    await mount(mod.Reportes)
    await input('#report-start-date', '2026-11-04')
    await input('#report-end-date', '2026-11-03')
    button('Aplicar Filtros').click()
    await tick()
    assert.match(document.querySelector('#report-period-error').textContent, /inicio no puede ser posterior/)
    assert.equal(button('Exportar Servicios').disabled, true)
    assert.ok(!document.querySelector('#screen').textContent.includes('Resumen del Período'))
    assert.throws(() => mod.useReports().getIngresosPorPeriodo('2026-11-04', '2026-11-03'), /inicio no puede ser posterior/)
    assert.throws(() => mod.useReports().exportarServicios('2026-11-04', '2026-11-03'), /inicio no puede ser posterior/)
    await input('#report-start-date', '')
    assert.match(document.querySelector('#report-period-error').textContent, /Ingresá las fechas/)
    await input('#report-start-date', '2026-11-03')
    button('Aplicar Filtros').click()
    await tick()
    assert.equal(document.querySelector('#report-period-error'), null)
    assert.equal(button('Exportar Servicios').disabled, false)
    assert.equal(mod.useReports().getServiciosPorPeriodo('2026-11-03', '2026-11-03').length, 1)
  })

  await check('lector CSV estricto recupera comas, comillas, CR/LF y ceros en Reportes, Configuración y próximos', async () => {
    const reports = mod.useReports()
    reports.exportarServicios('2026-11-03', '2026-11-03')
    let filas = parseCSV(await blobCSV.text())
    assert.equal(filas.length, 1)
    assert.equal(filas[0]['Descripción'], descripcion)
    assert.equal(filas[0]['Observaciones'], descripcion)
    assert.equal(filas[0].Cliente, state.datos.clientes[0].nombre)
    assert.equal(filas[0].Costo, '0')
    reports.exportarCSV([{ valor: '=1+1' }], 'qa', { 'Encabezado, "QA"': s => s.valor })
    assert.equal(parseCSV(await blobCSV.text())[0]['Encabezado, "QA"'], "'=1+1")
    for (const tipo of ['clientes', 'vehiculos', 'servicios', 'ordenes']) {
      mod.useBackupSystem().exportarCSV(tipo)
      filas = parseCSV(await blobCSV.text())
      assert.equal(filas.length, 1, tipo)
      if (tipo === 'servicios') assert.equal(filas[0]['Descripción'], descripcion)
    }
    const proximos = mod.useProximosServicios()
    filas = parseCSV(proximos.convertirACSV(proximos.obtenerDatosProximosServicios()))
    assert.equal(filas[0].Cliente, state.datos.clientes[0].nombre)
    assert.equal(filas[0].Observaciones, descripcion)
    assert.throws(() => parseCSV('Campo\n"comilla "rota"'), /Invalid|Quote|Closing/i, 'el lector rechaza CSV malformado')
  })

  await check('compartir fotos de una orden sin adjuntos explica el motivo y no abre WhatsApp', async () => {
    await data.actualizarOrden(4, { imagenes: [] })
    await mount(mod.Ordenes)
    const antes = opened.length
    const compartir = document.querySelector('[aria-label="Compartir fotos de la orden QA-0001"]')
    assert.match(compartir.textContent, /Sin fotos/)
    compartir.click()
    await tick()
    assert.equal(opened.length, antes)
    assert.ok(mod.useNotifications().notifications.value.some(n => /Esta orden no tiene fotos/.test(n.message)))
  })

  await check('compartir la orden incluye presupuesto y km en el textarea y WhatsApp recibe exactamente la edición sin guardar cambios', async () => {
    const original = structuredClone(state.datos)
    try {
      await data.actualizarOrden(4, { costoEstimado: 12500.5 })
      await data.actualizarVehiculo(2, { kilometraje: 85400 })
      await mount(mod.Ordenes)
      document.querySelector('[title="Compartir orden por WhatsApp"]').click()
      await tick()
      const mensaje = document.querySelector('#share-order-message')
      assert.ok(mensaje)
      assert.match(mensaje.value, /Presupuesto estimado \(no es comprobante de pago\): \$12\.500,50/)
      assert.match(mensaje.value, /Kilometraje registrado del vehículo: 85\.400 km/)
      assert.equal(button('Agregar presupuesto estimado'), undefined, 'el presupuesto ya está incluido, sin un botón que lo duplique')
      const antes = escrituras
      const modificado = mensaje.value.replace('$12.500,50', '$13.000,00') + '\nConfirmar con el taller.'
      await input('#share-order-message', modificado)
      const cantidadChats = opened.length
      button('Abrir WhatsApp').click()
      await tick()
      assert.equal(opened.length, cantidadChats + 1)
      assert.equal(new URL(opened.at(-1)[0]).searchParams.get('text'), modificado)
      assert.equal(escrituras, antes)
      assert.equal(data.ordenes.value[0].costoEstimado, 12500.5)
      assert.equal(data.vehiculos.value[0].kilometraje, 85400)
      button('Cerrar', document.querySelector('[aria-labelledby="share-order-title"]')).click()
      await tick()
    } finally { await data.reemplazarDatos(original, { action: 'restauracion' }) }
  })

  await check('un JSON anterior conserva todas sus colecciones y fechas históricas sin migrarlas silenciosamente', async () => {
    const original = structuredClone(state.datos)
    const historico = structuredClone(original)
    historico.servicios[0].proximoServicio = '2026-11-02'
    const json = JSON.stringify({ version: '1.0', fecha: '2026-11-03', datos: historico })
    const resultado = await mod.useBackupSystem().restaurarBackup(new File([json], 'backup-qa-antiguo.json', { type: 'application/json' }))
    assert.equal(resultado, true)
    assert.deepEqual(JSON.parse(JSON.stringify(state.datos)), historico)
    assert.equal(data.servicios.value[0].proximoServicio, '2026-11-02')
    await data.reemplazarDatos(original, { action: 'restauracion' })
  })

  await check('las capas y reglas responsive dejan libre navegación y colocan WhatsApp debajo de los modales (revisión estructural)', () => {
    const notices = readFileSync('src/components/NotificationContainer.vue', 'utf8')
    assert.match(notices, /bottom: 1rem/)
    assert.doesNotMatch(notices, /\btop:\s*1rem/)
    assert.match(notices, /pointer-events: none/)
    assert.match(notices, /max-height: min\(40dvh/)
    const floating = readFileSync('src/components/WhatsAppFloatingButton.vue', 'utf8')
    assert.match(floating, /fixed bottom-6 right-6 z-40/)
    const uploader = readFileSync('src/components/ImageUploader.vue', 'utf8')
    assert.match(uploader, /flex flex-wrap items-center gap-2 min-w-0/)
    const orders = readFileSync('src/views/OrdenesMantenimiento.vue', 'utf8')
    assert.match(orders, /\.order-dialog \.input-field,/)
    assert.match(orders, /min-width: 0/)
  })

  await check('documento imprimible conserva texto especial sin interpretarlo como HTML', () => {
    const texto = '<img data-qa="texto-no-html" src="x"> & "observación"'
    const html = mod.usePDF().generarPDFOrden({ ...state.datos.ordenes[0], cliente: { nombre: texto }, vehiculo: state.datos.vehiculos[0], descripcionTrabajo: texto, observaciones: texto })
    const documento = new JSDOM(html)
    try {
      assert.equal(documento.window.document.querySelector('[data-qa="texto-no-html"]'), null)
      assert.equal(documento.window.document.querySelector('.trabajo-detalle').textContent, texto)
      assert.equal(documento.window.document.querySelector('.info-value').textContent, texto)
    } finally { documento.window.close() }
  })

  assert.deepEqual(uiErrors, [], 'sin errores en handlers o renderizados de Vue')
  console.log(`${checks}/${checks} pruebas de correcciones QA superadas (DOM simulado, sin comprobación visual de píxeles)`)
} catch (error) {
  console.error(error.stack?.split('\n').filter(line => !line.includes('data:text')).join('\n') || error.message)
  process.exitCode = 1
} finally {
  ui?.unmount()
  for (const n of [...mod.useNotifications().notifications.value]) mod.useNotifications().removeNotification(n.id)
  dom.window.close()
}
