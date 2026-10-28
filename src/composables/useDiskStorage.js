import { ref } from 'vue'
import { datosTienenIntegridad } from '../utils/dataIntegrity'

// Las pruebas antiguas usan almacenes simulados sin un origen de navegador.
// En el navegador real NO existe fallback silencioso a localStorage.
export const usaDisco = typeof window !== 'undefined' && Boolean(window.location?.origin)
const estado = ref(usaDisco ? 'conectando' : 'pruebas')
const mensaje = ref('Verificando los datos en disco…')
const revision = ref(0)
const carpeta = ref('')
const guardando = ref(false)
const ultimaConfirmacion = ref(null)
const candidatoMigracion = ref(null)
const bloqueoPestana = ref(false)
let releaseLock
let eventosIniciados = false

const peticion = async (options) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch('/api/taller/state', { ...options, cache: 'no-store', signal: controller.signal })
    const body = await response.json()
    if (!response.ok) throw Object.assign(new Error(body.error || 'No se pudo leer el almacenamiento local'), { status: response.status })
    return body
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('El guardado no pudo confirmarse a tiempo. Recargá para verificarlo antes de repetir el alta.')
    throw error
  } finally { clearTimeout(timeout) }
}

const registrarRespuesta = body => {
  if (body.initialized && (!datosTienenIntegridad(body.datos) || !Number.isSafeInteger(body.revision))) throw Error('El servidor local devolvió datos inválidos. No se reemplazaron los registros.')
  revision.value = body.revision
  carpeta.value = body.directory || ''
  if (body.initialized) {
    estado.value = body.backupWarning ? 'advertencia' : 'listo'
    mensaje.value = body.backupWarning || 'Guardado en disco verificado'
    ultimaConfirmacion.value = body.fecha
  } else {
    estado.value = 'migracion'
    mensaje.value = body.recoveryRequired ? 'No hay una base confirmada y existen copias locales o no se pudo revisar su carpeta. Conservá los archivos e importá un JSON; no inicies un taller vacío.' : 'Primero importá los registros existentes o confirmá que es un taller nuevo.'
  }
  return body
}

const tomarBloqueo = async () => {
  if (!navigator.locks?.request) return // El servidor igualmente controla las revisiones.
  await new Promise(resolve => {
    navigator.locks.request('brabus-escritura-taller', { ifAvailable: true }, lock => {
      if (!lock) { bloqueoPestana.value = true; resolve(); return }
      resolve()
      return new Promise(release => { releaseLock = release })
    }).catch(() => { resolve() })
  })
}

export const iniciarDisco = async () => {
  try {
    await tomarBloqueo()
    const body = registrarRespuesta(await peticion())
    if (!eventosIniciados) {
      eventosIniciados = true
      window.addEventListener('beforeunload', e => { if (guardando.value) { e.preventDefault(); e.returnValue = '' } })
      window.addEventListener('pagehide', () => releaseLock?.())
    }
    return body
  } catch (error) {
    estado.value = 'error'
    mensaje.value = `No se cargaron los datos del disco: ${error.message}. No se inició un taller vacío.`
    throw error
  }
}

export const guardarEnDisco = async (datos, { action = 'guardar', confirmEmpty = false } = {}) => {
  if (guardando.value) throw Error('Hay un guardado en curso. Esperá su confirmación antes de guardar otro cambio.')
  if (bloqueoPestana.value) throw Error('El programa está abierto en otra pestaña. Cerrá las pestañas duplicadas y recargá esta antes de editar.')
  if (!['listo', 'advertencia', 'migracion'].includes(estado.value)) throw Error('El almacenamiento no está disponible. Recargá y verificá los datos antes de editar.')
  guardando.value = true
  try {
    const body = await peticion({ method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Brabus-Local': '1' }, body: JSON.stringify({ datos, expectedRevision: revision.value, action, confirmEmpty }) })
    if (JSON.stringify(body.datos) !== JSON.stringify(datos)) throw Error('La lectura de verificación no coincide con el cambio enviado. Recargá antes de continuar.')
    return registrarRespuesta(body)
  } catch (error) {
    // La petición podría haberse guardado aunque se corte la respuesta. No
    // reintentar automáticamente: podría duplicar registros o pisar cambios.
    estado.value = 'error'
    mensaje.value = `${error.message} Conservá el formulario y recargá para comprobar el último guardado.`
    throw error
  } finally { guardando.value = false }
}

export const useDiskStorage = () => ({ estado, mensaje, revision, carpeta, guardando, ultimaConfirmacion, candidatoMigracion, bloqueoPestana })
