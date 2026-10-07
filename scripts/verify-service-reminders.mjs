import assert from 'node:assert/strict'
import { build } from 'esbuild'
import 'fake-indexeddb/auto'

const values = new Map()
let storageUnavailable = false
globalThis.localStorage = {
  getItem(key) {
    if (storageUnavailable && key.includes('recordatorio')) throw new Error('Sin almacenamiento')
    return values.get(key) ?? null
  },
  setItem(key, value) {
    if (storageUnavailable && key.includes('recordatorio')) throw new Error('Sin almacenamiento')
    values.set(key, String(value))
  },
  removeItem: key => values.delete(key)
}
const originalSetTimeout = globalThis.setTimeout
globalThis.setTimeout = (...args) => {
  const timer = originalSetTimeout(...args)
  timer.unref()
  return timer
}
const result = await build({
  stdin: { contents: [
    "export { useAutoService } from './src/composables/useAutoService.js'",
    "export { useRecordatoriosServicios, CLAVE_ULTIMO_RECORDATORIO } from './src/composables/useRecordatoriosServicios.js'",
    "export { useFechaActual } from './src/composables/useFechaActual.js'",
    "export { useNotifications } from './src/composables/useNotifications.js'"
  ].join('\n'), resolveDir: process.cwd() },
  bundle: true, format: 'esm', platform: 'node', write: false
})
const moduleURL = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
let generation = 0
const load = () => import(`${moduleURL}#${generation++}`)
let checks = 0
const check = async (name, test) => { await test(); checks++; console.log(`✓ ${name}`) }
const reminderNotifications = mod => mod.useNotifications().notifications.value.filter(n => n.action === 'recordatorios-servicios')

try {
  let mod = await load()
  let data = mod.useAutoService()
  let reminders = mod.useRecordatoriosServicios()
  await check('espera la carga de datos y no avisa cuando no hay próximos servicios', async () => {
    assert.equal(reminders.mostrarResumenDiario(), false)
    await data.inicializacionDatos
    mod.useFechaActual().fechaActual.value = '2026-10-06'
    assert.equal(reminders.mostrarResumenDiario(), false)
    assert.equal(values.has(mod.CLAVE_ULTIMO_RECORDATORIO), false)
  })

  await check('resume vencidos, hoy y siete días; ignora cancelados, fechas inválidas y plazos mayores', async () => {
    const customer = { id: 1, nombre: 'Cliente de prueba', dniCuil: '12345678' }
    const dueDates = ['2026-10-05', '2026-10-06', '2026-10-13', '2026-10-14', 'fecha inválida', '2026-10-06', null]
    data.reemplazarDatos({
      clientes: [customer],
      vehiculos: dueDates.map((_, index) => ({ id: index + 1, clienteId: 1, marca: 'Ford', modelo: 'QA', patente: `QA${String(index).padStart(3, '0')}AA` })),
      servicios: dueDates.map((date, index) => ({ id: index + 1, clienteId: 1, vehiculoId: index + 1, tipoServicio: 'General', fechaServicio: '2026-09-01', proximoServicio: date, estado: index === 5 ? 'cancelado' : 'completado' })),
      ordenes: []
    })
    assert.deepEqual(reminders.recordatorios.value.map(v => v.diasRestantes), [-1, 0, 7])
    assert.deepEqual(reminders.resumen.value, { vencidos: 1, hoy: 1, proximos: 1 })
    assert.equal(reminders.mostrarResumenDiario(), true)
    assert.equal(reminderNotifications(mod).length, 1)
    assert.match(reminderNotifications(mod)[0].message, /1 vencidos.*1 para hoy.*1 en los próximos 7 días/)
    assert.equal(reminderNotifications(mod)[0].persistent, true)
    assert.equal(values.get(mod.CLAVE_ULTIMO_RECORDATORIO), '2026-10-06')
  })

  await check('no duplica el aviso al cambiar datos ni al volver a abrir el programa el mismo día', async () => {
    assert.equal(reminders.mostrarResumenDiario(), false)
    data.actualizarCliente(1, { nombre: 'Nombre actualizado' })
    assert.equal(reminders.mostrarResumenDiario(), false)
    mod = await load()
    data = mod.useAutoService()
    reminders = mod.useRecordatoriosServicios()
    await data.inicializacionDatos
    mod.useFechaActual().fechaActual.value = '2026-10-06'
    assert.equal(reminders.mostrarResumenDiario(), false)
    assert.equal(reminderNotifications(mod).length, 0)
  })

  await check('cambiar el día recalcula y reemplaza el resumen anterior', async () => {
    mod.useFechaActual().fechaActual.value = '2026-10-07'
    assert.equal(reminders.mostrarResumenDiario(), true)
    assert.equal(reminderNotifications(mod).length, 1)
    mod.useFechaActual().fechaActual.value = '2026-10-08'
    assert.equal(reminders.mostrarResumenDiario(), true)
    assert.equal(reminderNotifications(mod).length, 1)
    assert.equal(values.get(mod.CLAVE_ULTIMO_RECORDATORIO), '2026-10-08')
  })

  await check('actualizar o retirar el próximo servicio actualiza la lista sin dejar avisos antiguos', async () => {
    const before = reminders.recordatorios.value.length
    data.actualizarServicio(1, { proximoServicio: '2027-01-01' })
    assert.equal(reminders.recordatorios.value.length, before - 1)
    data.actualizarServicio(2, { proximoServicio: '' })
    assert.equal(reminders.recordatorios.value.some(v => v.id === 2), false)
    reminders.abrirRecordatorios()
    assert.equal(reminders.panelAbierto.value, true)
    reminders.cerrarRecordatorios()
    assert.equal(reminders.panelAbierto.value, false)
  })

  await check('desactivar persiste la preferencia y mantiene disponible la lista', async () => {
    reminders.configurarRecordatorios(false)
    assert.equal(reminderNotifications(mod).length, 0)
    mod = await load()
    data = mod.useAutoService()
    reminders = mod.useRecordatoriosServicios()
    await data.inicializacionDatos
    mod.useFechaActual().fechaActual.value = '2026-10-09'
    assert.equal(reminders.recordatoriosActivados.value, false)
    assert.ok(reminders.recordatorios.value.length > 0)
    assert.equal(reminders.mostrarResumenDiario(), false)
  })

  await check('no marca el aviso como mostrado mientras la pestaña está oculta', async () => {
    globalThis.document = { visibilityState: 'hidden' }
    reminders.configurarRecordatorios(true)
    assert.equal(reminders.mostrarResumenDiario(), false)
    assert.equal(values.get(mod.CLAVE_ULTIMO_RECORDATORIO), '2026-10-08')
    globalThis.document.visibilityState = 'visible'
    assert.equal(reminders.mostrarResumenDiario(), true)
    delete globalThis.document
  })

  await check('si localStorage falla evita repetir el recordatorio dentro de la sesión', async () => {
    storageUnavailable = true
    mod.useFechaActual().fechaActual.value = '2026-10-10'
    assert.equal(reminders.mostrarResumenDiario(), true)
    assert.equal(reminders.mostrarResumenDiario(), false)
    assert.equal(reminderNotifications(mod).length, 1)
    storageUnavailable = false
  })

  await check('notificaciones simultáneas tienen identificadores distintos', async () => {
    const notify = mod.useNotifications()
    const originalNow = Date.now
    Date.now = () => 1700000000000
    try { notify.warning('Uno'); notify.warning('Dos') } finally { Date.now = originalNow }
    const ids = notify.notifications.value.map(n => n.id)
    assert.equal(new Set(ids).size, ids.length)
  })
  await check('el aviso abierto actualiza sus cifras y desaparece si no quedan servicios por vencer', async () => {
    data.actualizarServicio(3, { proximoServicio: '' })
    assert.equal(reminders.mostrarResumenDiario(), false)
    assert.match(reminderNotifications(mod)[0].message, /1 en los próximos 7 días/)
    data.reemplazarDatos({ clientes: data.clientes.value, vehiculos: data.vehiculos.value, servicios: [], ordenes: [] })
    assert.equal(reminders.mostrarResumenDiario(), false)
    assert.equal(reminderNotifications(mod).length, 0)
  })
  console.log(`${checks}/${checks} pruebas de recordatorios superadas`)
} catch (error) {
  console.error(`${error.name}: ${error.message}`)
  process.exitCode = 1
}
