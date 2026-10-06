import { ref } from 'vue'
import { datosTienenIntegridad } from '../utils/dataIntegrity'

const DB_NAME = 'autoservice-recovery'
const DB_VERSION = 1
const STORE_NAME = 'snapshots'
const MAX_SNAPSHOTS = 3
const LAST_SNAPSHOT_KEY = 'autoservice_last_local_snapshot'

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
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(maximo)

const limitarSnapshots = async () => {
  const snapshots = await obtenerTodosLosSnapshots()
  const antiguos = seleccionarSnapshotsAntiguos(snapshots)

  await Promise.all(antiguos.map((snapshot) => eliminarSnapshot(snapshot.id)))
}

export const crearSnapshotRecuperacion = async (datos, origen = 'automatico') => {
  if (!validarDatosAutoservice(datos)) {
    throw new Error('Los datos no tienen un formato válido para crear la copia local')
  }

  const fecha = new Date().toISOString()
  const snapshot = {
    version: '1.0',
    fecha,
    origen,
    datos: clonarDatos(datos)
  }

  try {
    const db = await abrirBaseRecuperacion()
    const snapshotsExistentes = await obtenerTodosLosSnapshots()
    const ultimoSnapshot = seleccionarUltimoSnapshotValido(snapshotsExistentes)
    if (ultimoSnapshot && JSON.stringify(ultimoSnapshot.datos) === JSON.stringify(datos)) {
      ultimoSnapshotLocal.value = ultimoSnapshot.fecha
      estadoRecuperacion.value = 'protegido'
      mensajeRecuperacion.value = 'Los datos no cambiaron desde la última copia local.'
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
      estadoRecuperacion.value = 'protegido'
      mensajeRecuperacion.value = 'Los datos tienen una copia local de recuperación.'
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

export const programarSnapshotRecuperacion = (datos, demora = 700) => {
  snapshotPendiente = clonarDatos(datos)
  if (snapshotTimer) clearTimeout(snapshotTimer)

  snapshotTimer = setTimeout(() => {
    const datosAGuardar = snapshotPendiente
    snapshotTimer = null
    snapshotPendiente = null
    void crearSnapshotRecuperacion(datosAGuardar).catch(() => {})
  }, demora)
}

export const seleccionarUltimoSnapshotValido = (snapshots) =>
  [...snapshots]
    .filter((snapshot) => snapshot?.fecha && validarDatosAutoservice(snapshot.datos))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0] || null

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
