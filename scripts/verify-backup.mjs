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

const downloads = []
globalThis.localStorage = new LocalStorageMock()
globalThis.window = { location: { reload() {} } }
globalThis.confirm = () => true
globalThis.document = {
  body: {
    appendChild() {},
    removeChild() {}
  },
  createElement() {
    return {
      href: '',
      download: '',
      click() { downloads.push(this.download) }
    }
  }
}
globalThis.FileReader = class {
  readAsText(file) {
    this.onload({ target: { result: file.content } })
  }
}

try {
  const compilado = await build({
    stdin: {
      contents: [
        "export { useAutoService } from './src/composables/useAutoService.js'",
        "export { useBackupSystem } from './src/composables/useBackupSystem.js'",
        "export { validarDatosAutoservice, seleccionarSnapshotsAntiguos, seleccionarUltimoSnapshotValido, crearSnapshotRecuperacion, obtenerUltimoSnapshotValido } from './src/composables/useDataRecovery.js'"
      ].join('\n'),
      resolveDir: process.cwd(),
      sourcefile: 'backup-test-entry.js'
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
  const {
    useAutoService,
    useBackupSystem,
    validarDatosAutoservice,
    seleccionarSnapshotsAntiguos,
    seleccionarUltimoSnapshotValido,
    crearSnapshotRecuperacion,
    obtenerUltimoSnapshotValido
  } = await import(`data:text/javascript;base64,${codigo}`)

  assert.equal(validarDatosAutoservice({ clientes: [], vehiculos: [], servicios: [], ordenes: [] }), true)
  assert.equal(validarDatosAutoservice({ clientes: [], vehiculos: {}, servicios: [], ordenes: [] }), false)
  assert.deepEqual(
    seleccionarSnapshotsAntiguos([
      { id: 1, fecha: '2026-01-01T00:00:00.000Z' },
      { id: 2, fecha: '2026-01-02T00:00:00.000Z' },
      { id: 3, fecha: '2026-01-03T00:00:00.000Z' },
      { id: 4, fecha: '2026-01-04T00:00:00.000Z' }
    ]).map(snapshot => snapshot.id),
    [1]
  )
  assert.equal(
    seleccionarUltimoSnapshotValido([
      { id: 1, fecha: '2026-01-01T00:00:00.000Z', datos: { clientes: [], vehiculos: [], servicios: [], ordenes: [] } },
      { id: 2, fecha: '2026-01-02T00:00:00.000Z', datos: { clientes: [], vehiculos: null, servicios: [], ordenes: [] } },
      { id: 3, fecha: '2026-01-03T00:00:00.000Z', datos: { clientes: [], vehiculos: [], servicios: [], ordenes: [] } }
    ]).id,
    3
  )

  const datos = useAutoService()
  await datos.inicializacionDatos
  datos.clientes.value = [{
    id: 1,
    nombre: 'Cliente, "Prueba"',
    email: 'cliente@example.com',
    telefono: '5491112345678',
    fechaCreacion: '2026-01-01T12:00:00.000Z'
  }]
  datos.vehiculos.value = [{
    id: 2,
    clienteId: 1,
    marca: 'Ford',
    modelo: 'Focus',
    anio: 2020,
    patente: 'AA123BB',
    kilometraje: 50000
  }]
  datos.servicios.value = [{
    id: 3,
    clienteId: 1,
    vehiculoId: 2,
    tipoServicio: 'Mantenimiento general',
    estado: 'completado',
    fechaServicio: '2026-01-10',
    costo: 150000,
    kilometrajeActual: 50000
  }]
  datos.ordenes.value = [{
    id: 4,
    numeroOrden: 'OM-2026-0001',
    clienteId: 1,
    vehiculoId: 2,
    estado: 'completada',
    prioridad: 'media',
    fechaCreacion: '2026-01-10T12:00:00.000Z',
    descripcionTrabajo: 'Trabajo de prueba'
  }]

  const backup = useBackupSystem()
  const segundaInstancia = useBackupSystem()
  assert.equal(backup.backupAutomatico, segundaInstancia.backupAutomatico)
  assert.equal(backup.ultimoBackup, segundaInstancia.ultimoBackup)

  for (const tipo of ['clientes', 'vehiculos', 'servicios', 'ordenes']) {
    assert.equal(backup.exportarCSV(tipo), true)
  }
  assert.deepEqual(downloads.slice(0, 4), [
    'clientes-autoservice.csv',
    'vehiculos-autoservice.csv',
    'servicios-autoservice.csv',
    'ordenes-autoservice.csv'
  ])

  assert.equal(await backup.crearBackup(false), true)
  assert.match(downloads[4], /^backup-autoservice-completo-.+\.json$/)
  assert.ok(backup.ultimoBackup.value)

  const restaurado = {
    version: '1.0',
    fecha: '2026-09-24T12:00:00.000Z',
    datos: {
      clientes: [{ id: 10, nombre: 'Restaurado' }],
      vehiculos: [],
      servicios: [],
      ordenes: []
    }
  }
  assert.equal(await backup.restaurarBackup({ content: JSON.stringify(restaurado) }), true)
  assert.equal(datos.clientes.value[0].nombre, 'Restaurado')
  assert.equal(JSON.parse(localStorage.getItem('autoservice_clientes'))[0].nombre, 'Restaurado')

  await crearSnapshotRecuperacion(restaurado.datos, 'prueba-automatica')
  assert.equal((await obtenerUltimoSnapshotValido()).datos.clientes[0].nombre, 'Restaurado')

  // Simular un localStorage corrupto y una recarga completa de la aplicación.
  localStorage.setItem('autoservice_clientes', '{json-corrupto')
  const segundaCarga = await import(`data:text/javascript;base64,${codigo}#recuperacion`)
  const datosRecuperados = segundaCarga.useAutoService()
  const resultadoRecuperacion = await datosRecuperados.inicializacionDatos
  assert.equal(resultadoRecuperacion.recuperado, true)
  assert.equal(datosRecuperados.clientes.value[0].nombre, 'Restaurado')
  assert.equal(JSON.parse(localStorage.getItem('autoservice_clientes'))[0].nombre, 'Restaurado')

  // Si localStorage deja de aceptar lecturas y escrituras, la copia de IndexedDB
  // igualmente debe permitir trabajar con los datos durante la sesión.
  globalThis.localStorage = {
    getItem() { throw new Error('localStorage no disponible') },
    setItem() { throw new Error('localStorage no disponible') },
    removeItem() { throw new Error('localStorage no disponible') }
  }
  const cargaSinLocalStorage = await import(`data:text/javascript;base64,${codigo}#sin-localstorage`)
  const datosSinLocalStorage = cargaSinLocalStorage.useAutoService()
  const resultadoSinLocalStorage = await datosSinLocalStorage.inicializacionDatos
  assert.equal(resultadoSinLocalStorage.recuperado, true)
  assert.equal(resultadoSinLocalStorage.guardadoPrincipalDisponible, false)
  assert.equal(datosSinLocalStorage.clientes.value[0].nombre, 'Restaurado')

  process.stdout.write('Backup and recovery smoke test: OK\n')
} catch (err) {
  console.error(err)
  process.exit(1)
}

process.exit(0)
