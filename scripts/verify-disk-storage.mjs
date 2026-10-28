import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, basename } from 'node:path'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { build } from 'esbuild'
import 'fake-indexeddb/auto'
import { abrirAlmacenamiento } from '../server/storage.mjs'
import { crearAPI } from '../server/api.mjs'

const temp = mkdtempSync(join(tmpdir(), 'brabus-storage-test-'))
let store, api, server
let checks = 0
const check = async (name, fn) => { await fn(); checks++; console.log(`✓ ${name}`) }
const datos = {
  clientes: [{ id: 1, nombre: 'Piñón — Cliente QA', dniCuil: '20123456786', email: '', notas: 'Información histórica' }],
  vehiculos: [{ id: 2, clienteId: 1, marca: 'Ford', modelo: 'QA', patente: 'AA123BB' }],
  servicios: [{ id: 3, clienteId: 1, vehiculoId: 2, tipoServicio: 'Mantenimiento general', fechaServicio: '2026-01-01', proximoServicio: '2027-01-01', estado: 'completado', descripcion: 'Trabajo completo' }],
  ordenes: [{ id: 4, clienteId: 1, vehiculoId: 2, numeroOrden: 'OM-2026-0001', descripcionTrabajo: 'Orden original', imagenes: [{ fileId: 'foto-qa', nombre: 'Foto conservada' }] }]
}
const vacio = { clientes: [], vehiculos: [], servicios: [], ordenes: [] }
try {
  await check('primera instalación no carga ni guarda un taller vacío automáticamente', () => {
    store = abrirAlmacenamiento(join(temp, 'principal'))
    assert.equal(store.leer().initialized, false)
    assert.throws(() => store.guardar({ datos, expectedRevision: 0 }), /Primero importá/)
  })
  await check('importa sin pérdida todas las propiedades del JSON anterior y verifica su copia local', () => {
    const migrated = store.guardar({ datos, expectedRevision: 0, action: 'migracion' })
    assert.deepEqual(migrated.datos, datos)
    assert.deepEqual(migrated.counts, { clientes: 1, vehiculos: 1, servicios: 1, ordenes: 1 })
    const json = readdirSync(join(temp, 'principal', 'backups')).find(n => n.endsWith('.json'))
    assert.deepEqual(JSON.parse(readFileSync(join(temp, 'principal', 'backups', json), 'utf8')).datos, datos)
  })
  await check('conserva datos al cerrar/reabrir SQLite y rechaza una pestaña desactualizada', () => {
    store.close(); store = abrirAlmacenamiento(join(temp, 'principal'))
    assert.deepEqual(store.leer().datos, datos)
    const updated = structuredClone(datos); updated.clientes[0].nombre = 'Guardado más reciente'
    store.guardar({ datos: updated, expectedRevision: 1 })
    assert.throws(() => store.guardar({ datos, expectedRevision: 1 }), /otra pestaña/)
    assert.equal(store.leer().datos.clientes[0].nombre, 'Guardado más reciente')
  })
  await check('un fallo de validación no elimina ni cambia registros o revisión', () => {
    const before = store.leer()
    const invalid = structuredClone(datos); invalid.clientes = []
    assert.throws(() => store.guardar({ datos: invalid, expectedRevision: before.revision }), /Datos inválidos/)
    assert.deepEqual(store.leer(), before)
    assert.throws(() => store.guardar({ datos: vacio, expectedRevision: before.revision, action: 'restauracion' }), /vacía/)
    assert.deepEqual(store.leer(), before)
  })
  await check('restaura el JSON anterior, incluidos documentos, fotos y fechas, sin mutar el original', () => {
    const original = JSON.stringify(datos)
    const result = store.guardar({ datos, expectedRevision: store.leer().revision, action: 'restauracion' })
    assert.deepEqual(result.datos, datos)
    assert.equal(JSON.stringify(datos), original)
  })
  await check('una base corrupta o desaparecida nunca se presenta como un taller vacío nuevo', () => {
    const directory = join(temp, 'corrupta')
    const corrupta = abrirAlmacenamiento(directory)
    corrupta.guardar({ datos, expectedRevision: 0, action: 'migracion' }); corrupta.close()
    const raw = new DatabaseSync(join(directory, 'taller.sqlite'))
    raw.exec("UPDATE estado SET checksum='no-coincide'"); raw.close()
    const opened = abrirAlmacenamiento(directory)
    assert.throws(() => opened.leer(), /verificación/); opened.close()
    renameSync(join(directory, 'taller.sqlite'), join(directory, 'taller-preservado.sqlite'))
    const missing = abrirAlmacenamiento(directory)
    assert.equal(missing.leer().recoveryRequired, true)
    assert.throws(() => missing.guardar({ datos: vacio, expectedRevision: 0, action: 'nuevo' }), /información existente/)
    assert.equal(missing.guardar({ datos, expectedRevision: 0, action: 'restauracion' }).revision, 2)
    missing.close()
  })
  await check('si falla la copia JSON, conserva lo confirmado en SQLite e informa advertencia', () => {
    const directory = join(temp, 'sin-copia')
    const disk = abrirAlmacenamiento(directory)
    renameSync(join(directory, 'backups'), join(directory, 'backups-preservados'))
    writeFileSync(join(directory, 'backups'), 'simulación de ruta no escribible')
    const saved = disk.guardar({ datos, expectedRevision: 0, action: 'migracion' })
    assert.match(saved.backupWarning, /quedó guardado/)
    assert.deepEqual(disk.leer().datos, datos)
    assert.match(disk.leer().backupWarning, /falta la copia JSON/)
    disk.close()
    const reopened = abrirAlmacenamiento(directory)
    assert.match(reopened.leer().backupWarning, /falta la copia JSON/)
    reopened.close()
  })
  await check('la rotación limita copias e historial sin eliminar el último cambio', () => {
    const directory = join(temp, 'rotacion')
    const disk = abrirAlmacenamiento(directory)
    for (let revision = 0; revision < 205; revision++) {
      disk.guardar({ datos, expectedRevision: revision, action: revision ? 'guardar' : 'migracion' })
    }
    const copias = readdirSync(join(directory, 'backups')).filter(n => n.endsWith('.json'))
    assert.equal(copias.length, 50)
    assert.ok(copias.some(n => n.endsWith('-r205.json')))
    disk.close()
    const raw = new DatabaseSync(join(directory, 'taller.sqlite'))
    assert.equal(raw.prepare('SELECT count(*) AS cantidad FROM historial').get().cantidad, 200)
    raw.close()
  })
  api = crearAPI({ directory: join(temp, 'http') })
  server = createServer((req, res) => api.middleware(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const realFetch = globalThis.fetch
  await check('la API rechaza escrituras de páginas externas y solicitudes sin protección', async () => {
    assert.equal((await realFetch(`${base}/api/taller/state`, { method: 'PUT', headers: { Origin: 'https://sitio-ajeno.example', 'Content-Type': 'application/json', 'X-Brabus-Local': '1' }, body: '{}' })).status, 403)
    assert.equal((await realFetch(`${base}/api/taller/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403)
    assert.equal((await (await realFetch(`${base}/api/taller/state`)).json()).initialized, false)
  })
  const compiled = await build({ stdin: { contents: [
    "export {useAutoService} from './src/composables/useAutoService.js'",
    "export {useBackupSystem} from './src/composables/useBackupSystem.js'",
    "export {useDiskStorage} from './src/composables/useDiskStorage.js'",
    "export {useNotifications} from './src/composables/useNotifications.js'",
    "export {useGoogleDrive} from './src/composables/useGoogleDrive.js'"
  ].join('\n'), resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'node', write: false, define: { 'import.meta.env.VITE_GOOGLE_CLIENT_ID': '"qa-only"' } })
  const url = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`
  let generation = 0
  const browserStorage = new Map()
  globalThis.localStorage = { getItem: k => browserStorage.get(k) ?? null, setItem: (k, v) => browserStorage.set(k, String(v)), removeItem: k => browserStorage.delete(k) }
  globalThis.window = { location: { origin: base }, addEventListener() {} }
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
  globalThis.confirm = () => true
  globalThis.FileReader = class { readAsText(file) { this.onload({ target: { result: file.content } }) } }
  globalThis.fetch = (path, options) => realFetch(new URL(path, base), options)
  const load = () => import(`${url}#${generation++}`)
  let oauthRequests = 0
  for (const [coleccion, registros] of Object.entries(datos)) browserStorage.set(`autoservice_${coleccion}`, JSON.stringify(registros))
  let mod = await load(), app = mod.useAutoService()
  await app.inicializacionDatos
  await check('el navegador no empieza vacío: solicita importar el JSON y confirma los cuatro conjuntos', async () => {
    assert.equal(app.datosListos.value, false)
    assert.equal(mod.useDiskStorage().estado.value, 'migracion')
    assert.deepEqual(JSON.parse(JSON.stringify(mod.useDiskStorage().candidatoMigracion.value)), datos)
    assert.deepEqual(JSON.parse(browserStorage.get('autoservice_clientes')), datos.clientes)
    assert.equal((await (await realFetch(`${base}/api/taller/state`)).json()).initialized, false)
    assert.equal(await mod.useBackupSystem().restaurarBackup({ content: JSON.stringify({ version: '1.0', fecha: '2026-10-01', datos }) }), true)
    assert.deepEqual(JSON.parse(JSON.stringify({ clientes: app.clientes.value, vehiculos: app.vehiculos.value, servicios: app.servicios.value, ordenes: app.ordenes.value })), datos)
    assert.equal(app.datosListos.value, true)
  })
  await check('no anuncia éxito ni cambia registros antes de recibir confirmación del disco', async () => {
    let liberar
    const gate = new Promise(r => { liberar = r })
    globalThis.fetch = async (path, options) => { if (options?.method === 'PUT') await gate; return realFetch(new URL(path, base), options) }
    const notifications = mod.useNotifications().notifications.value
    const antes = notifications.filter(n => n.type === 'success').length
    const saving = app.agregarCliente({ nombre: 'Solo después del COMMIT' })
    assert.equal(app.clientes.value.length, 1)
    assert.equal(mod.useDiskStorage().guardando.value, true)
    assert.equal(notifications.filter(n => n.type === 'success').length, antes)
    liberar(); assert.ok(await saving)
    assert.equal(app.clientes.value.length, 2)
    assert.equal(notifications.filter(n => n.type === 'success').length, antes + 1)
    globalThis.fetch = (path, options) => realFetch(new URL(path, base), options)
  })
  await check('limpiar el navegador o cambiar de contexto no elimina registros guardados en disco', async () => {
    browserStorage.clear()
    const second = await load(); const other = second.useAutoService(); await other.inicializacionDatos
    assert.equal(other.clientes.value.length, 2)
    assert.equal(other.ordenes.value[0].imagenes[0].fileId, 'foto-qa')
    await app.agregarCliente({ nombre: 'Escritura más reciente' })
    assert.equal(await other.agregarCliente({ nombre: 'Pestaña obsoleta' }), null)
    assert.equal(second.useDiskStorage().estado.value, 'error')
    const disk = await (await realFetch(`${base}/api/taller/state`)).json()
    assert.equal(disk.datos.clientes.length, 3)
    assert.ok(!disk.datos.clientes.some(c => c.nombre === 'Pestaña obsoleta'))
  })
  await check('un corte de conexión no produce un falso guardado ni borra los registros anteriores', async () => {
    const before = app.clientes.value.length
    globalThis.fetch = async () => { throw Error('Red local interrumpida (simulada)') }
    assert.equal(await app.agregarCliente({ nombre: 'No confirmado' }), null)
    assert.equal(app.clientes.value.length, before)
    assert.equal(mod.useDiskStorage().estado.value, 'error')
    globalThis.fetch = (path, options) => realFetch(new URL(path, base), options)
    mod = await load(); app = mod.useAutoService(); await app.inicializacionDatos
    assert.equal(app.clientes.value.length, before)
  })
  await check('CRUD de las cuatro colecciones se confirma en disco y conserva el estado al recargar', async () => {
    const client = await app.agregarCliente({ nombre: 'CRUD cliente', dniCuil: '12345678' })
    const car = await app.agregarVehiculo({ clienteId: client.id, marca: 'Fiat', modelo: 'QA', patente: 'AB456CD' })
    const service = await app.agregarServicio({ clienteId: client.id, vehiculoId: car.id, tipoServicio: 'General', fechaServicio: '2026-10-28', estado: 'completado' })
    const order = await app.agregarOrden({ clienteId: client.id, vehiculoId: car.id, numeroOrden: 'OM-QA-2', descripcionTrabajo: 'Prueba CRUD' })
    assert.ok(await app.actualizarCliente(client.id, { nombre: 'Cliente actualizado' }))
    assert.ok(await app.actualizarVehiculo(car.id, { modelo: 'Modelo actualizado' }))
    assert.ok(await app.actualizarServicio(service.id, { observaciones: 'Conservadas' }))
    assert.ok(await app.actualizarOrden(order.id, { observaciones: 'Orden conservada' }))
    assert.equal(await app.eliminarCliente(client.id), false)
    assert.ok(await app.eliminarOrden(order.id))
    assert.ok(await app.eliminarServicio(service.id))
    assert.ok(await app.eliminarVehiculo(car.id))
    assert.ok(await app.eliminarCliente(client.id))
    const reloaded = await load(); const fresh = reloaded.useAutoService(); await fresh.inicializacionDatos
    assert.equal(fresh.clientes.value.length, 3)
    assert.equal(fresh.vehiculos.value.length, 1)
    assert.equal(fresh.ordenes.value[0].imagenes[0].fileId, 'foto-qa')
  })
  await check('una respuesta perdida después del COMMIT no genera reintentos ni altas duplicadas', async () => {
    mod = await load(); app = mod.useAutoService(); await app.inicializacionDatos
    const previous = app.clientes.value.length
    let writes = 0
    globalThis.fetch = async (path, options) => {
      const result = await realFetch(new URL(path, base), options)
      if (options?.method === 'PUT') { writes++; throw Error('Respuesta perdida después del COMMIT (simulada)') }
      return result
    }
    assert.equal(await app.agregarCliente({ nombre: 'Una única alta confirmada al recargar' }), null)
    assert.equal(app.clientes.value.length, previous)
    assert.equal(writes, 1)
    globalThis.fetch = (path, options) => realFetch(new URL(path, base), options)
    mod = await load(); app = mod.useAutoService(); await app.inicializacionDatos
    assert.equal(app.clientes.value.length, previous + 1)
    assert.equal(app.clientes.value.filter(c => c.nombre === 'Una única alta confirmada al recargar').length, 1)
  })
  await check('la restauración desde Drive confirma en SQLite el mismo JSON anterior, sin depender de IndexedDB', async () => {
    let token = null
    window.gapi = { load: (_, options) => options.callback(), client: { init: async () => {}, getToken: () => token, setToken: value => { token = value } } }
    window.google = { accounts: { oauth2: { initTokenClient(options) { const client = { ...options, requestAccessToken: () => { oauthRequests++; return client.callback({ access_token: 'qa-token-simulado', expires_in: 3600 }) } }; return client } } } }
    globalThis.fetch = (path, options) => {
      if (String(path).includes('googleapis.com/drive/v3/about?')) return Promise.resolve({ ok: true, json: async () => ({ user: { emailAddress: 'qa@example.com' } }) })
      if (String(path).includes('googleapis.com/drive/v3/files/qa-backup?')) return Promise.resolve({ ok: true, text: async () => JSON.stringify({ version: '1.0', datos }) })
      return realFetch(new URL(path, base), options)
    }
    const drive = mod.useGoogleDrive()
    assert.equal(await drive.initializeGoogleDrive(), true)
    assert.equal(await drive.authenticateUser(), true)
    const backup = mod.useBackupSystem()
    assert.equal(await backup.restaurarBackupDeGoogleDrive({ id: 'qa-backup', nombre: 'backup-anterior-qa.json' }), true)
    assert.deepEqual(JSON.parse(JSON.stringify({ clientes: app.clientes.value, vehiculos: app.vehiculos.value, servicios: app.servicios.value, ordenes: app.ordenes.value })), datos)
    assert.deepEqual((await (await realFetch(`${base}/api/taller/state`)).json()).datos, datos)
    const previousIDB = globalThis.indexedDB
    globalThis.indexedDB = undefined
    backup.backupGoogleDrive.value = false
    assert.equal(await backup.crearBackup(false, { descargar: false, notificar: false }), true)
    globalThis.indexedDB = previousIDB
    globalThis.fetch = (path, options) => realFetch(new URL(path, base), options)
  })
  await check('un respaldo programado sin sesión no abre OAuth ni informa una copia de nube exitosa', async () => {
    const drive = mod.useGoogleDrive(), backup = mod.useBackupSystem()
    drive.cerrarSesion()
    backup.backupGoogleDrive.value = true
    backup.ultimoBackupGoogleDrive.value = new Date().toISOString()
    const requestsBefore = oauthRequests
    assert.equal(await backup.crearBackup(true, { descargar: false, notificar: false }), false)
    assert.equal(oauthRequests, requestsBefore)
    assert.equal(backup.copiaNubePendiente.value, true)
  })
  await check('al reconectar Drive reintenta los cambios pendientes aunque la copia anterior sea reciente', async () => {
    const drive = mod.useGoogleDrive(), backup = mod.useBackupSystem()
    let uploaded = 0
    const deleted = []
    const cloudFiles = Array.from({ length: 30 }, (_, i) => ({ id: `copia-${i}`, name: `backup-autoservice-${i}.json`, modifiedTime: '2026-10-28T12:00:00.000Z' }))
    cloudFiles.push({ id: 'copia-ayer', name: 'backup-autoservice-ayer.json', modifiedTime: '2026-10-27T12:00:00.000Z' })
    window.gapi.client.drive = { files: {
      list: async options => ({ result: { files: options.q.includes('mimeType=') ? [{ id: 'carpeta-qa' }] : cloudFiles } }),
      delete: async ({ fileId }) => { deleted.push(fileId) }
    } }
    globalThis.fetch = async (path, options) => {
      if (String(path).includes('googleapis.com/drive/v3/about?')) return { ok: true, json: async () => ({ user: { emailAddress: 'qa@example.com' } }) }
      if (String(path).includes('googleapis.com/upload/drive/v3/files?')) {
        assert.deepEqual(JSON.parse(await options.body.get('file').text()).datos, datos)
        uploaded++
        return { ok: true, status: 200, json: async () => ({ id: 'nueva-copia-qa', name: 'backup-autoservice-qa.json' }) }
      }
      if (String(path).includes('googleapis.com')) throw Error('Solicitud Google no simulada')
      return realFetch(new URL(path, base), options)
    }
    backup.backupAutomatico.value = false
    backup.iniciarBackupAutomatico()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(uploaded, 0)
    assert.equal(await drive.authenticateUser(), true)
    for (let i = 0; i < 100 && backup.copiaNubePendiente.value; i++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(uploaded, 1)
    assert.equal(backup.copiaNubePendiente.value, false)
    assert.equal(deleted.length, 10)
    assert.ok(!deleted.includes('copia-ayer'))
    backup.detenerBackupAutomatico()
    globalThis.fetch = (path, options) => realFetch(new URL(path, base), options)
  })
  await check('una segunda pestaña sin bloqueo de edición queda protegida contra escrituras', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: { locks: { request: async (_, options, callback) => callback(null) } }, configurable: true })
    const otherModule = await load()
    const other = otherModule.useAutoService(); await other.inicializacionDatos
    assert.equal(otherModule.useDiskStorage().bloqueoPestana.value, true)
    assert.equal(await other.agregarCliente({ nombre: 'No debe escribirse' }), null)
    assert.equal((await (await realFetch(`${base}/api/taller/state`)).json()).datos.clientes.length, 1)
  })
  console.log(`${checks}/${checks} pruebas de almacenamiento en disco superadas`)
} finally {
  store?.close()
  if (server) await new Promise(resolve => server.close(resolve))
  api?.close()
  // Solo el directorio efímero creado por esta prueba, nunca la carpeta real.
  if (resolve(temp).startsWith(resolve(tmpdir()) + '\\') && basename(temp).startsWith('brabus-storage-test-')) rmSync(temp, { recursive: true, force: true })
}
