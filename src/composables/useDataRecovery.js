import { ref } from 'vue'
import { datosTienenIntegridad } from '../utils/dataIntegrity'

const DB_NAME = 'autoservice-recovery'
const DB_VERSION = 1
const STORE_NAME = 'snapshots'
const MAX_SNAPSHOTS = 3
const LAST_SNAPSHOT_KEY = 'autoservice_last_local_snapshot'
export const CLAVE_REVISION_DATOS = 'autoservice_revision_datos'
let ultimaRevision = 0

export const registrarRevisionDatos = (revision) => {
  const valor = Number(revision)
  if (Number.isSafeInteger(valor) && valor > 0) ultimaRevision = Math.max(ultimaRevision, valor)
}

export const leerRevisionDatosLocales = () => {
  try {
    const revision = Number(localStorage.getItem(CLAVE_REVISION_DATOS))
    return Number.isSafeInteger(revision) && revision > 0 ? revision : 0
  } catch {
    return 0
  }
}

export const crearRevisionDatos = () => {
  registrarRevisionDatos(leerRevisionDatosLocales())
  ultimaRevision = Math.max(Date.now(), ultimaRevision + 1)
  return ultimaRevision
}

const leerUltimoSnapshotGuardado = () => {
  try {
    return localStorage.getItem(LAST_SNAPSHOT_KEY) || null
  } catch {
    return null
  }
}

const ultimoSnapshotLocal = ref(leerUltimoSnapshotGuardado())
const estadoRecuperacion = ref('inicializando')
const mensajeRecuperacion = ref('Preparando la protección local...')
const datosRecuperados = ref(false)

let dbPromise = null
let snapshotTimer = null
let snapshotPendiente = null
let colaSnapshots = Promise.resolve()

const compararSnapshots = (a, b) =>
  (Number(b.revision) || new Date(b.fecha).getTime()) -
  (Number(a.revision) || new Date(a.fecha).getTime()) || (b.id || 0) - (a.id || 0)

const informarSnapshotDisponible = (revision, mensaje, datos) => {
  let coincideConGuardadoPrincipal = false
  try {
    const datosLocales = Object.fromEntries(['clientes', 'vehiculos', 'servicios', 'ordenes'].map(
      (coleccion) => [coleccion, JSON.parse(localStorage.getItem(`autoservice_${coleccion}`))]
    ))
    coincideConGuardadoPrincipal = JSON.stringify(datosLocales) === JSON.stringify(datos)
  } catch { /* La copia de recuperación permanece disponible aunque el guardado principal falle. */ }

  if (leerRevisionDatosLocales() < revision && !coincideConGuardadoPrincipal) {
    estadoRecuperacion.value = 'advertencia'
    mensajeRecuperacion.value = 'La copia de recuperación conserva los últimos cambios, pero el guardado principal no pudo actualizarse. Crea un backup externo.'
  } else {
    estadoRecuperacion.value = 'protegido'
    mensajeRecuperacion.value = mensaje
  }
}

export const validarDatosAutoservice = (datos) => {
  return datosTienenIntegridad(datos)
}

const clonarDatos = (datos) => JSON.parse(JSON.stringify(datos))

const abrirBaseRecuperacion = () => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB no está disponible en este navegador'))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('fecha', 'fecha')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error || new Error('No se pudo abrir el almacenamiento de recuperación'))
    }
  })

  return dbPromise
}

const obtenerTodosLosSnapshots = async () => {
  const db = await abrirBaseRecuperacion()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error || new Error('No se pudieron leer las copias locales'))
  })
}

const eliminarSnapshot = async (id) => {
  const db = await abrirBaseRecuperacion()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('No se pudo eliminar una copia antigua'))
  })
}

export const seleccionarSnapshotsAntiguos = (snapshots, maximo = MAX_SNAPSHOTS) =>
  [...snapshots]
    .sort(compararSnapshots)
    .slice(maximo)

const limitarSnapshots = async () => {
  const snapshots = await obtenerTodosLosSnapshots()
  const antiguos = seleccionarSnapshotsAntiguos(snapshots)

  await Promise.all(antiguos.map((snapshot) => eliminarSnapshot(snapshot.id)))
}

const guardarSnapshotRecuperacion = async (datos, origen, revision) => {
  if (!validarDatosAutoservice(datos)) {
    throw new Error('Los datos no tienen un formato válido para crear la copia local')
  }

  const fecha = new Date().toISOString()
  const snapshot = {
    version: '1.0',
    fecha,
    revision,
    origen,
    datos: clonarDatos(datos)
  }

  try {
    const db = await abrirBaseRecuperacion()
    const snapshotsExistentes = await obtenerTodosLosSnapshots()
    const ultimoSnapshot = seleccionarUltimoSnapshotValido(snapshotsExistentes)
    if (ultimoSnapshot && JSON.stringify(ultimoSnapshot.datos) === JSON.stringify(datos)) {
      ultimoSnapshotLocal.value = ultimoSnapshot.fecha
      informarSnapshotDisponible(ultimoSnapshot.revision || revision, 'Los datos no cambiaron desde la última copia local.', datos)
      return ultimoSnapshot
    }

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).add(snapshot)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('No se pudo crear la copia local'))
    })

    await limitarSnapshots()
    ultimoSnapshotLocal.value = fecha
    try {
      localStorage.setItem(LAST_SNAPSHOT_KEY, fecha)
      informarSnapshotDisponible(revision, 'Los datos tienen una copia local de recuperación.', datos)
    } catch {
      estadoRecuperacion.value = 'advertencia'
      mensajeRecuperacion.value = 'La copia de recuperación está disponible, pero localStorage no admite escrituras.'
    }
    return snapshot
  } catch (err) {
    estadoRecuperacion.value = 'advertencia'
    mensajeRecuperacion.value = err.message
    throw err
  }
}

export const crearSnapshotRecuperacion = (datos, origen = 'automatico', revision = crearRevisionDatos()) => {
  const copia = clonarDatos(datos)
  registrarRevisionDatos(revision)
  const guardado = colaSnapshots.then(() => guardarSnapshotRecuperacion(copia, origen, revision))
  colaSnapshots = guardado.catch(() => {})
  return guardado
}

export const programarSnapshotRecuperacion = (datos, demora = 700, revision = crearRevisionDatos()) => {
  snapshotPendiente = { datos: clonarDatos(datos), revision }
  if (snapshotTimer) clearTimeout(snapshotTimer)

  snapshotTimer = setTimeout(() => {
    const pendiente = snapshotPendiente
    snapshotTimer = null
    snapshotPendiente = null
    void crearSnapshotRecuperacion(pendiente.datos, 'automatico', pendiente.revision).catch(() => {})
  }, demora)
}

export const seleccionarUltimoSnapshotValido = (snapshots) =>
  [...snapshots]
    .filter((snapshot) => snapshot?.fecha && validarDatosAutoservice(snapshot.datos))
    .sort(compararSnapshots)[0] || null

export const obtenerUltimoSnapshotValido = async () => {
  try {
    const snapshots = await obtenerTodosLosSnapshots()
    return seleccionarUltimoSnapshotValido(snapshots)
  } catch (err) {
    estadoRecuperacion.value = 'advertencia'
    mensajeRecuperacion.value = err.message
    return null
  }
}

export const marcarRecuperacionExitosa = (fecha) => {
  datosRecuperados.value = true
  estadoRecuperacion.value = 'recuperado'
  mensajeRecuperacion.value = `Se recuperaron automáticamente los datos guardados el ${new Date(fecha).toLocaleString('es-AR')}.`
}

export const marcarDatosProtegidos = () => {
  if (estadoRecuperacion.value === 'recuperado') return
  estadoRecuperacion.value = 'protegido'
  mensajeRecuperacion.value = 'Los datos locales son válidos y están protegidos.'
}

export const marcarAdvertenciaRecuperacion = (mensaje) => {
  estadoRecuperacion.value = 'advertencia'
  mensajeRecuperacion.value = mensaje
}

export const useDataRecovery = () => ({
  ultimoSnapshotLocal,
  estadoRecuperacion,
  mensajeRecuperacion,
  datosRecuperados,
  crearSnapshotRecuperacion,
  obtenerUltimoSnapshotValido
})
