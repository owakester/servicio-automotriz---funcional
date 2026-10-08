import assert from 'node:assert/strict'
import { build } from 'esbuild'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { readFileSync } from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'

// Todo ocurre en almacenamientos simulados, sin tocar los datos del navegador.
class LocalStorageMock {
  data = new Map()
  failWrites = false
  failOnKey = null
  getItem(key) { return this.data.get(key) ?? null }
  setItem(key, value) {
    if ((this.failWrites && key.startsWith('autoservice_')) || this.failOnKey === key) {
      throw new Error('QuotaExceededError')
    }
    this.data.set(key, String(value))
  }
  removeItem(key) { this.data.delete(key) }
}

const storage = new LocalStorageMock()
globalThis.localStorage = storage
let csvBlob
const downloadedBlobs = []
globalThis.document = {
  body: { appendChild() {}, removeChild() {} },
  createElement: () => ({ download: '', style: {}, setAttribute() {}, click() {} })
}
URL.createObjectURL = (blob) => { csvBlob = blob; downloadedBlobs.push(blob); return 'blob:test' }

const compiled = await build({
  stdin: {
    contents: [
      "export { useAutoService } from './src/composables/useAutoService.js'",
      "export { useOrdenes } from './src/composables/useOrdenes.js'",
      "export { useReports } from './src/composables/useReports.js'",
      "export { useBackupSystem } from './src/composables/useBackupSystem.js'",
      "export { usePDF } from './src/composables/usePDF.js'",
      "export { useProximosServicios } from './src/composables/useProximosServicios.js'",
      "export { useNotifications } from './src/composables/useNotifications.js'",
      "export { default as OrdenesView } from './src/views/OrdenesMantenimiento.vue'",
      "export { default as ClientesView } from './src/views/Clientes.vue'",
      "export { default as ServiciosView } from './src/views/Servicios.vue'",
      "export { default as ProximoServicio } from './src/components/ProximoServicio.vue'",
      "export { createSSRApp, h } from 'vue'",
      "export { renderToString } from '@vue/server-renderer'",
      "export { createRouter, createMemoryHistory } from 'vue-router'",
      "export * from './src/composables/useDataRecovery.js'",
      "export * from './src/composables/useFechaActual.js'",
      "export * from './src/utils/dates.js'"
    ].join('\n'),
    resolveDir: process.cwd()
  },
  bundle: true, format: 'esm', platform: 'node', write: false,
  define: { 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '"test-client-id"' },
  plugins: [{
    name: 'order-form-script',
    setup(builder) {
      builder.onLoad({ filter: /\.vue$/ }, ({ path }) => {
        if (!/[/\\](OrdenesMantenimiento|Clientes|Servicios|ProximoServicio)\.vue$/.test(path)) return { contents: 'export default {}', loader: 'js' }
        const { descriptor } = parse(readFileSync(path, 'utf8'))
        return { contents: compileScript(descriptor, { id: 'order-form-regression', inlineTemplate: path.endsWith('ProximoServicio.vue') }).content, loader: 'js' }
      })
    }
  }]
})
const codeUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`
let loadCount = 0
const load = async () => {
  // Cargar Vue en modo servidor. El documento simulado se usa solamente para CSV.
  const csvDocument = globalThis.document
  delete globalThis.document
  try { return await import(`${codeUrl}#load-${loadCount++}`) }
  finally { globalThis.document = csvDocument }
}
const settle = () => new Promise(resolve => setTimeout(resolve, 20))
const snapshotSettled = () => new Promise(resolve => setTimeout(resolve, 800))
const current = (app) => ({
  clientes: app.clientes.value, vehiculos: app.vehiculos.value,
  servicios: app.servicios.value, ordenes: app.ordenes.value
})
const check = async (name, fn) => {
  await fn()
  process.stdout.write(`✓ ${name}\n`)
}

try {
  let mod = await load()
  let app = mod.useAutoService()
  await app.inicializacionDatos
  app.agregarCliente({ nombre: 'Cliente inicial', email: 'inicial@example.com' })
  await snapshotSettled()

  await check('recupera cambios guardados en IndexedDB si localStorage falló y conserva datos anteriores válidos', async () => {
    const revisionAnterior = storage.getItem(mod.CLAVE_REVISION_DATOS)
    storage.failWrites = true
    app.agregarCliente({ nombre: 'Cliente protegido por copia', email: 'recuperar@example.com' })
    await snapshotSettled()
    assert.equal(JSON.parse(storage.getItem('autoservice_clientes')).length, 1)
    assert.equal(storage.getItem(mod.CLAVE_REVISION_DATOS), revisionAnterior)
    assert.equal((await mod.obtenerUltimoSnapshotValido()).datos.clientes.length, 2)
    assert.equal(mod.useDataRecovery().estadoRecuperacion.value, 'advertencia')
    // La recuperación debe servir también mientras el fallo de escritura persiste.
    const unavailable = await load()
    const unavailableApp = unavailable.useAutoService()
    const recovery = await unavailableApp.inicializacionDatos
    assert.equal(recovery.recuperado, true)
    assert.equal(recovery.guardadoPrincipalDisponible, false)
    assert.equal(unavailableApp.clientes.value.length, 2)
    storage.failWrites = false
    mod = await load()
    app = mod.useAutoService()
    assert.equal(app.datosListos.value, false)
    assert.equal((await app.inicializacionDatos).recuperado, true)
    assert.equal(app.clientes.value.length, 2)
    assert.equal(JSON.parse(storage.getItem('autoservice_clientes')).length, 2)
  })

  await check('un respaldo anterior no reemplaza cambios más recientes del guardado principal', async () => {
    await new Promise(resolve => setTimeout(resolve, 150))
    app.agregarCliente({ nombre: 'Más reciente', email: 'reciente@example.com' })
    await settle()
    // Recargar antes de que transcurran los 700 ms de la copia automática.
    mod = await load()
    app = mod.useAutoService()
    assert.equal((await app.inicializacionDatos).recuperado, false)
    assert.equal(app.clientes.value.length, 3)
    await snapshotSettled()
  })

  await check('un respaldo manual no informa un fallo inexistente cuando localStorage contiene los mismos datos', async () => {
    await mod.crearSnapshotRecuperacion(current(app), 'manual')
    assert.equal(mod.useDataRecovery().estadoRecuperacion.value, 'protegido')
  })

  await check('una restauración manual y una eliminación prevalecen sobre copias antiguas', async () => {
    app.reemplazarDatos({ clientes: [{ id: 100, nombre: 'Restaurado manualmente' }], vehiculos: [], servicios: [], ordenes: [] })
    await settle()
    mod = await load()
    app = mod.useAutoService()
    await app.inicializacionDatos
    assert.equal(app.clientes.value.length, 1)
    assert.equal(app.clientes.value[0].nombre, 'Restaurado manualmente')
    await snapshotSettled()
    app.eliminarCliente(100)
    await settle()
    mod = await load()
    app = mod.useAutoService()
    await app.inicializacionDatos
    assert.equal(app.clientes.value.length, 0)
    await snapshotSettled()
  })

  await check('una escritura parcial revierte colecciones y revisión juntas', async () => {
    const antes = JSON.parse(JSON.stringify(current(app)))
    const revision = storage.getItem(mod.CLAVE_REVISION_DATOS)
    storage.failOnKey = 'autoservice_servicios'
    assert.throws(() => app.reemplazarDatos({ clientes: [{ id: 200, nombre: 'No debe aplicarse' }], vehiculos: [], servicios: [], ordenes: [] }))
    storage.failOnKey = null
    assert.deepEqual(current(app), antes)
    assert.deepEqual(JSON.parse(storage.getItem('autoservice_clientes')), antes.clientes)
    assert.equal(storage.getItem(mod.CLAVE_REVISION_DATOS), revision)
  })

  await check('fechas de calendario y filtros mantienen el día en Argentina, UTC y una zona con horario de verano', async () => {
    const tzOriginal = process.env.TZ
    try {
      for (const tz of ['America/Argentina/Buenos_Aires', 'UTC', 'America/New_York']) {
        process.env.TZ = tz
        assert.equal(mod.formatearFecha('2026-10-06'), '06/10/2026')
        assert.equal(mod.fechaParaInput(new Date(2026, 9, 6, 23, 59)), '2026-10-06')
        assert.equal(mod.diasHastaFecha('2026-03-09', '2026-03-08'), 1)
        assert.equal(mod.estaFechaVencida('2026-10-06', new Date(2026, 9, 6, 23, 59)), false)
        assert.equal(mod.estaFechaVencida('2026-10-05', '2026-10-06'), true)
        assert.equal(mod.sumarAnos('2024-02-29'), '2025-02-28')
        assert.equal(mod.sumarAnos('2026-10-06'), '2027-10-06')
        assert.equal(mod.fechaParaInput('2026-02-30'), '')
      }
    } finally {
      if (tzOriginal === undefined) delete process.env.TZ
      else process.env.TZ = tzOriginal
    }
  })

  process.env.TZ = 'America/Argentina/Buenos_Aires'
  const client = app.agregarCliente({ nombre: 'Cliente fechas', email: 'fechas@example.com' })
  const car = app.agregarVehiculo({ clienteId: client.id, marca: 'Ford', modelo: 'Focus', patente: 'AB123CD' })
  const service = app.agregarServicio({
    clienteId: client.id, vehiculoId: car.id, tipoServicio: 'General',
    fechaServicio: '2026-10-06', proximoServicio: '2026-10-06', costo: 1000, estado: 'completado'
  })
  const orders = mod.useOrdenes()
  const reports = mod.useReports()
  const order = orders.crearOrden({
    clienteId: client.id, vehiculoId: car.id,
    descripcionTrabajo: 'Prueba de imágenes y vencimiento', fechaVencimiento: '2026-10-06'
  })

  await check('las fechas guardadas se conservan al editar y al cambiar el día', async () => {
    const creation = service.fechaCreacion
    app.actualizarServicio(service.id, { descripcion: 'Edición', fechaCreacion: '2027-01-01T12:00:00Z' })
    mod.useFechaActual().fechaActual.value = '2026-10-06'
    assert.equal(orders.ordenesVencidas.value.length, 0)
    assert.equal(orders.ordenesProximasVencer.value.length, 1)
    assert.equal(app.estadisticas.value.ordenesVencidas, 0)
    assert.equal(app.vehiculosConAlertas.value[0].alerta.dias, 0)
    mod.useFechaActual().fechaActual.value = '2026-10-07'
    assert.equal(orders.ordenesVencidas.value.length, 1)
    assert.equal(orders.ordenesProximasVencer.value.length, 0)
    assert.equal(app.estadisticas.value.ordenesVencidas, 1)
    assert.equal(app.vehiculosConAlertas.value[0].alerta.tipo, 'vencido')
    assert.equal(app.servicios.value[0].fechaServicio, '2026-10-06')
    assert.equal(app.servicios.value[0].fechaCreacion, creation)
    orders.cambiarEstadoOrden(order.id, 'cancelada')
    assert.equal(orders.ordenesVencidas.value.length, 0)
    assert.equal(app.estadisticas.value.ordenesVencidas, 0)
  })

  await check('reportes incluyen el primer y último día del mes y exportan las fechas sin desfase', async () => {
    for (const date of ['2026-10-01', '2026-10-31', '2026-11-01', '2026-10-31T23:30:00-03:00']) {
      app.agregarServicio({ clienteId: client.id, vehiculoId: car.id, tipoServicio: 'Límite mensual', fechaServicio: date, costo: 1 })
    }
    assert.equal(reports.getServiciosPorPeriodo('2026-10-01', '2026-10-31').length, 4)
    assert.equal(reports.getEstadisticasAnuales(2026)[9].cantidadServicios, 4)
    assert.equal(reports.getEstadisticasAnuales(2026)[10].cantidadServicios, 1)
    assert.equal(app.estadisticas.value.serviciosEstesMes, 4)
    reports.exportarServicios('2026-10-06', '2026-10-06')
    assert.match(await csvBlob.text(), /06\/10\/2026/)
    assert.doesNotMatch(await csvBlob.text(), /05\/10\/2026/)
  })

  await check('agregar y eliminar imágenes no lanzan errores y conservan los adjuntos al recargar', async () => {
    assert.ok(orders.agregarImagenAOrden(order.id, { fileId: 'foto-a', nombre: 'Motor' }))
    assert.ok(orders.agregarImagenAOrden(order.id, { fileId: 'foto-b', nombre: 'Repuesto' }))
    assert.ok(orders.eliminarImagenDeOrden(order.id, 'foto-a'))
    assert.deepEqual(orders.obtenerImagenesDeOrden(order.id).map(img => img.fileId), ['foto-b'])
    await settle()
    mod = await load()
    app = mod.useAutoService()
    await app.inicializacionDatos
    assert.deepEqual(mod.useOrdenes().obtenerImagenesDeOrden(order.id).map(img => img.fileId), ['foto-b'])
  })

  await check('reportes y exportación de clientes suman solo trabajos completados, incluso con importes como texto', async () => {
    const before = JSON.parse(JSON.stringify(current(app)))
    try {
      app.reemplazarDatos({ ...before, servicios: [
        { id: 901, clienteId: client.id, vehiculoId: car.id, tipoServicio: 'General', fechaServicio: '2026-10-06', estado: 'completado', costo: '1250' },
        { id: 902, clienteId: client.id, vehiculoId: car.id, tipoServicio: 'General', fechaServicio: '2026-10-06', estado: 'completado', costo: 750 },
        ...['pendiente', 'en_progreso', 'cancelado'].map((estado, i) => ({ id: 903 + i, clienteId: client.id, vehiculoId: car.id, tipoServicio: 'General', fechaServicio: '2026-10-06', estado, costo: 99999 }))
      ] })
      const financial = mod.useReports()
      const result = financial.getIngresosPorPeriodo('2026-10-01', '2026-10-31')
      assert.equal(result.totalIngresos, 2000)
      assert.equal(result.cantidadServicios, 2)
      assert.deepEqual(result.ingresosPorTipo.General, { cantidad: 2, total: 2000 })
      assert.equal(financial.getEstadisticasAnuales(2026)[9].ingresos, 2000)
      assert.equal(financial.getEstadisticasAnuales(2026)[9].cantidadServicios, 5)
      assert.equal(financial.getClientesFrecuentes()[0].totalGastado, 2000)
      financial.exportarClientes()
      assert.match(await csvBlob.text(), /Total de trabajos realizados/)
      assert.doesNotMatch(await csvBlob.text(), /99999/)
      app.reemplazarDatos({ ...before, servicios: [] })
      assert.equal(financial.getIngresosPorPeriodo('2026-10-01', '2026-10-31').totalIngresos, 0)
    } finally { app.reemplazarDatos(before) }
  })

  await check('DNI/CUIL aparece en reportes, todos los CSV, comprobantes y copias de recuperación', async () => {
    const before = JSON.parse(JSON.stringify(current(app)))
    const originalWindow = globalThis.window
    try {
      app.actualizarCliente(client.id, { dniCuil: '20-12345678-6' })
      const sinServicios = app.agregarCliente({ nombre: 'Cliente sin servicios QA', dniCuil: '87654321' })
      const ultimoServicio = [...app.servicios.value].sort((a, b) => mod.parsearFechaLocal(b.fechaServicio) - mod.parsearFechaLocal(a.fechaServicio))[0]
      app.actualizarServicio(ultimoServicio.id, { estado: 'completado', proximoServicio: '2026-10-07' })
      const identityReports = mod.useReports()
      assert.equal(identityReports.getClientesFrecuentes()[0].dniCuil, '20123456786')
      identityReports.exportarClientes()
      let csv = await csvBlob.text()
      assert.match(csv.split('\n')[0], /DNI\/CUIL/)
      assert.match(csv, /20-12345678-6/)
      assert.match(csv, /Cliente sin servicios QA,87654321/)
      identityReports.exportarServicios('2026-10-01', '2026-10-31')
      assert.match(await csvBlob.text(), /20-12345678-6/)

      const backup = mod.useBackupSystem()
      for (const tipo of ['clientes', 'vehiculos', 'servicios', 'ordenes']) {
        backup.exportarCSV(tipo)
        csv = await csvBlob.text()
        assert.match(csv.split('\n')[0], /DNI\/CUIL/)
        assert.match(csv, /20-12345678-6/, tipo)
      }
      const proximos = mod.useProximosServicios()
      csv = proximos.convertirACSV(proximos.obtenerDatosProximosServicios())
      assert.match(csv, /DNI\/CUIL/)
      assert.match(csv, /20-12345678-6/)
      const start = downloadedBlobs.length
      assert.equal(backup.descargarTodosLosReportesCSV(), true)
      await new Promise(resolve => setTimeout(resolve, 1300))
      const reportFiles = await Promise.all(downloadedBlobs.slice(start).map(blob => blob.text()))
      assert.equal(reportFiles.length, 8)
      for (const index of [0, 1, 2, 3, 7]) {
        assert.match(reportFiles[index].split('\n')[0], /DNI\/CUIL/)
        assert.match(reportFiles[index], /20-12345678-6/)
      }
      backup.backupGoogleDrive.value = false
      await backup.crearBackup(false, { notificar: false })
      const saved = JSON.parse(await csvBlob.text())
      assert.equal(saved.datos.clientes.find(c => c.id === client.id).dniCuil, '20123456786')
      assert.equal(saved.datos.clientes.find(c => c.id === sinServicios.id).dniCuil, '87654321')
      assert.equal((await mod.obtenerUltimoSnapshotValido()).datos.clientes.find(c => c.id === client.id).dniCuil, '20123456786')
      app.reemplazarDatos(saved.datos)
      await settle()
      assert.equal(JSON.parse(storage.getItem('autoservice_clientes')).find(c => c.id === client.id).dniCuil, '20123456786')

      let printedHTML = ''
      globalThis.window = { open: () => ({ document: { write: html => { printedHTML = html }, close() {} }, focus() {} }) }
      const printOrder = { ...order, cliente: app.obtenerClientePorId(client.id), vehiculo: car }
      assert.ok(mod.usePDF().generarPDFOrden(printOrder))
      assert.match(printedHTML, /DNI\/CUIL:/)
      assert.match(printedHTML, /20-12345678-6/)
      const brand = JSON.parse(readFileSync('src/assets/brand.json', 'utf8'))
      assert.match(printedHTML, /alt="Brabus Service"/)
      assert.ok(printedHTML.includes(`src="${brand.logo}"`), 'el logo debe estar embebido para imprimir sin conexión')
      assert.match(brand.logo, /^data:image\/jpeg;base64,/)
      assert.equal(Buffer.from(brand.logo.split(',')[1], 'base64').subarray(0, 3).toString('hex'), 'ffd8ff')
      assert.match(printedHTML, /Brabus Service - Sistema de Gestión Automotriz/)
      assert.doesNotMatch(printedHTML, /AutoService Pro/)
    } finally {
      globalThis.window = originalWindow
      app.reemplazarDatos(before)
    }
  })

  await check('guardar el formulario de una orden conserva fotos nuevas y no resucita fotos eliminadas', async () => {
    let form
    const screen = mod.createSSRApp({
      setup() {
        form = mod.OrdenesView.setup({}, { expose() {} })
        return () => mod.h('div')
      }
    })
    screen.use(mod.createRouter({ history: mod.createMemoryHistory('/'), routes: [{ path: '/', component: {} }] }))
    await mod.renderToString(screen)
    const activeOrders = mod.useOrdenes()
    form.editarOrden(activeOrders.ordenesCompletas.value.find(item => item.id === order.id))
    form.handleImagenSubida({ fileId: 'foto-c', nombre: 'Nueva foto' })
    form.handleImagenEliminada({ fileId: 'foto-b' })
    form.formulario.value.descripcionTrabajo = 'Trabajo actualizado'
    form.guardarOrden()
    assert.deepEqual(activeOrders.obtenerImagenesDeOrden(order.id).map(img => img.fileId), ['foto-c'])
    assert.equal(app.ordenes.value.find(item => item.id === order.id).descripcionTrabajo, 'Trabajo actualizado')

    // Fallo posterior a generar el HTML: antes el catch confundía el error
    // capturado con la función que muestra el aviso y lanzaba un TypeError.
    const originalWindow = globalThis.window
    globalThis.window = { open: () => ({ document: { write() {}, close() {} }, focus() {} }) }
    const notifications = mod.useNotifications()
    const htmlOrder = { ...activeOrders.ordenesCompletas.value.find(item => item.id === order.id) }
    Object.defineProperty(form.googleDriveEnabled, 'value', { get() { throw new Error('Fallo simulado después de generar el documento') }, configurable: true })
    const originalConsoleError = console.error
    const loggedErrors = []
    console.error = (...args) => loggedErrors.push(args)
    try {
      await assert.doesNotReject(() => form.generarYSubirPDF(htmlOrder))
      assert.ok(notifications.notifications.value.some(item => item.type === 'error' && item.message.includes('No se pudo generar o subir')))
      assert.equal(loggedErrors.length, 1)
    } finally {
      console.error = originalConsoleError
      if (originalWindow === undefined) delete globalThis.window
      else globalThis.window = originalWindow
    }
  })

  await check('el reporte de próximos servicios coincide con las alertas al completar o cancelar el nuevo mantenimiento', async () => {
    const before = JSON.parse(JSON.stringify(current(app)))
    try {
      const previous = { ...service, id: 301, fechaServicio: '2026-01-06', proximoServicio: '2027-01-06', estado: 'completado' }
      const recent = { ...service, id: 302, fechaServicio: '2026-10-07', proximoServicio: '2027-10-07', estado: 'en_progreso' }
      app.reemplazarDatos({ clientes: [client], vehiculos: [car], servicios: [previous, recent], ordenes: [] })
      const report = mod.useProximosServicios()
      const badge = (service, campo = 'dias') => mod.renderToString(mod.createSSRApp({ render: () => mod.h(mod.ProximoServicio, { servicio: service, campo }) }))
      assert.equal(report.obtenerDatosProximosServicios()[0].fecha_proximo_servicio, '2027-01-06')
      assert.match(await badge(app.servicios.value[1]), /Se activa al completar el servicio/)
      app.actualizarServicio(302, { estado: 'completado' })
      assert.equal(report.obtenerDatosProximosServicios().length, 1)
      assert.equal(report.obtenerDatosProximosServicios()[0].fecha_proximo_servicio, '2027-10-07')
      assert.equal(app.vehiculosConAlertas.value[0].ultimoServicio.id, 302)
      const historical = await badge(app.servicios.value[0])
      assert.match(historical, /Recordatorio reemplazado/)
      assert.doesNotMatch(historical, /días|Hoy|Mañana/)
      assert.match(await badge(app.servicios.value[0], 'fecha'), /06\/01\/2027.*Fecha histórica/s)
      assert.doesNotMatch(await badge(app.servicios.value[1]), /reemplazado|Se activa al completar/)
      app.actualizarServicio(302, { estado: 'cancelado' })
      assert.equal(report.obtenerDatosProximosServicios()[0].fecha_proximo_servicio, '2027-01-06')
      assert.equal(app.servicios.value.length, 2)
      assert.match(await badge(app.servicios.value[1]), /Sin recordatorio \(cancelado\)/)
    } finally { app.reemplazarDatos(before) }
  })

  await check('correo opcional, selección por cliente y consulta de servicios no alteran datos ni relaciones', async () => {
    const before = JSON.parse(JSON.stringify(current(app)))
    const view = async (component) => {
      let form
      const screen = mod.createSSRApp({ setup() {
        form = component.setup({}, { expose() {} })
        return () => mod.h('div')
      } })
      screen.use(mod.createRouter({ history: mod.createMemoryHistory('/'), routes: [{ path: '/', component: {} }] }))
      await mod.renderToString(screen)
      return form
    }
    try {
      const clientsForm = await view(mod.ClientesView)
      clientsForm.formulario.value = { nombre: 'Cliente sin correo', telefono: '1155554444', email: '', dniCuil: '12345678' }
      clientsForm.guardarCliente()
      const noEmail = app.clientes.value.find(c => c.nombre === 'Cliente sin correo')
      assert.ok(noEmail)
      assert.equal(noEmail.email, '')
      clientsForm.editarCliente(noEmail)
      clientsForm.formulario.value.email = 'mal-formato'
      clientsForm.guardarCliente()
      assert.equal(clientsForm.getError('email'), 'Formato de email inválido')
      assert.equal(app.obtenerClientePorId(noEmail.id).email, '')
      clientsForm.formulario.value.email = 'opcional@example.com'
      clientsForm.guardarCliente()
      clientsForm.editarCliente(app.obtenerClientePorId(noEmail.id))
      clientsForm.formulario.value.email = ''
      clientsForm.guardarCliente()
      assert.equal(app.obtenerClientePorId(noEmail.id).email, '')

      const multiple = app.agregarCliente({ nombre: 'Dos vehículos', dniCuil: '87654321' })
      const first = app.agregarVehiculo({ clienteId: noEmail.id, marca: 'Ford', modelo: 'Focus', patente: 'QA111BC' })
      const second = app.agregarVehiculo({ clienteId: multiple.id, marca: 'Fiat', modelo: 'Uno', patente: 'QA222BC' })
      const third = app.agregarVehiculo({ clienteId: multiple.id, marca: 'Ford', modelo: 'Ka', patente: 'QA333BC' })
      const empty = app.agregarCliente({ nombre: 'Sin vehículos' })
      const orderForm = await view(mod.OrdenesView)
      orderForm.busquedaCliente.value = '12.345.678'
      assert.deepEqual(orderForm.clientesDisponibles.value.map(c => c.id), [noEmail.id])
      orderForm.formulario.value.clienteId = String(noEmail.id)
      orderForm.onClienteChange()
      assert.equal(orderForm.formulario.value.vehiculoId, first.id)
      assert.deepEqual(orderForm.vehiculosDisponibles.value.map(v => v.id), [first.id])
      orderForm.formulario.value.clienteId = multiple.id
      orderForm.onClienteChange()
      assert.equal(orderForm.formulario.value.vehiculoId, '')
      assert.deepEqual(orderForm.vehiculosDisponibles.value.map(v => v.id), [second.id, third.id])
      orderForm.formulario.value.vehiculoId = second.id
      orderForm.onVehiculoChange()
      assert.equal(orderForm.formulario.value.clienteId, multiple.id)
      orderForm.formulario.value.clienteId = empty.id
      orderForm.onClienteChange()
      assert.equal(orderForm.vehiculosDisponibles.value.length, 0)
      assert.equal(orderForm.formulario.value.vehiculoId, '')
      const count = app.ordenes.value.length
      orderForm.guardarOrden()
      assert.equal(app.ordenes.value.length, count)
      orderForm.formulario.value = { vehiculoId: first.id, clienteId: multiple.id, descripcionTrabajo: 'Cliente derivado del vehículo', estado: 'pendiente', prioridad: 'media' }
      orderForm.guardarOrden()
      assert.equal(app.ordenes.value.at(-1).clienteId, noEmail.id)
      assert.equal(app.ordenes.value.at(-1).vehiculoId, first.id)

      const serviceForm = await view(mod.ServiciosView)
      const snapshot = JSON.stringify(current(app))
      const existing = serviceForm.serviciosConRelaciones.value[0]
      assert.ok(existing)
      await serviceForm.verServicio(existing)
      assert.equal(serviceForm.servicioDetalle.value.id, existing.id)
      assert.equal(serviceForm.mostrarFormulario.value, false)
      serviceForm.cerrarDetalle()
      assert.equal(serviceForm.servicioDetalle.value, null)
      assert.equal(JSON.stringify(current(app)), snapshot)
    } finally { app.reemplazarDatos(before) }
  })

  await snapshotSettled()
  await check('migra datos y copias de la versión anterior sin reemplazar el guardado principal válido', async () => {
    globalThis.indexedDB = new IDBFactory()
    const legacyStorage = new LocalStorageMock()
    globalThis.localStorage = legacyStorage
    const legacyData = { clientes: [{ id: 10, nombre: 'Versión actual del cliente' }], vehiculos: [], servicios: [], ordenes: [] }
    for (const [collection, values] of Object.entries(legacyData)) {
      legacyStorage.setItem(`autoservice_${collection}`, JSON.stringify(values))
    }
    // Copia producida antes de incorporar las revisiones de guardado.
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('autoservice-recovery', 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true })
        store.createIndex('fecha', 'fecha')
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('snapshots', 'readwrite')
        transaction.objectStore('snapshots').add({
          fecha: '2026-01-01T12:00:00Z', version: '1.0',
          datos: { ...legacyData, clientes: [{ id: 10, nombre: 'Versión anterior del cliente' }] }
        })
        transaction.oncomplete = () => { db.close(); resolve() }
        transaction.onerror = () => reject(transaction.error)
      }
    })
    const legacy = await load()
    const legacyApp = legacy.useAutoService()
    assert.equal((await legacyApp.inicializacionDatos).recuperado, false)
    assert.equal(legacyApp.clientes.value[0].nombre, 'Versión actual del cliente')
    assert.ok(Number(legacyStorage.getItem(legacy.CLAVE_REVISION_DATOS)) > 0)
    await new Promise(resolve => setTimeout(resolve, 150))
  })

  await check('IndexedDB no disponible no impide cargar un guardado principal válido', async () => {
    globalThis.indexedDB = undefined
    const noDB = await load()
    const noDBApp = noDB.useAutoService()
    assert.equal((await noDBApp.inicializacionDatos).recuperado, false)
    assert.equal(noDBApp.clientes.value[0].nombre, 'Versión actual del cliente')
    await new Promise(resolve => setTimeout(resolve, 150))
    assert.equal(noDB.useDataRecovery().estadoRecuperacion.value, 'advertencia')
  })

  process.stdout.write('Functional regression tests: OK\n')
  process.exit(0)
} catch (err) {
  console.error(`${err.name}: ${err.message}`)
  process.exit(1)
}
