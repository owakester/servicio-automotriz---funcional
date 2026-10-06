// src/composables/useGoogleDrive.js
import { ref } from 'vue'
import { useNotifications } from './useNotifications'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const CORREO_DRIVE = (import.meta.env?.VITE_GOOGLE_DRIVE_EMAIL || '').trim().toLowerCase()

const leerLocalSeguro = (clave) => {
  try { return localStorage.getItem(clave) }
  catch { return null }
}
const guardarLocalSeguro = (clave, valor) => {
  try { localStorage.setItem(clave, valor) }
  catch { /* La sesión actual sigue funcionando en memoria. */ }
}
const eliminarLocalSeguro = (clave) => {
  try { localStorage.removeItem(clave) }
  catch { /* Sin almacenamiento persistente no hay nada que limpiar. */ }
}

// Una sola sesión de Google Drive para Configuración, Backups e Imágenes.
const isInitialized = ref(false)
const isAuthenticated = ref(false)
const accessToken = ref(null)
const refreshToken = ref(leerLocalSeguro('google_refresh_token'))
const tokenExpiry = ref(leerLocalSeguro('google_token_expiry'))
const tokenClient = ref(null)
const initializationError = ref(null)
const cuentaGoogleDrive = ref('')
let tokenVerificado = null
let revisionSesion = 0
let solicitudTokenEnCurso = null

export const useGoogleDrive = () => {
  const { success, error } = useNotifications()

  const limpiarSesion = () => {
    revisionSesion++
    tokenVerificado = null
    accessToken.value = null
    cuentaGoogleDrive.value = ''
    tokenExpiry.value = null
    isAuthenticated.value = false
    eliminarLocalSeguro('google_token_expiry')
    try { window.gapi?.client?.setToken?.(null) } catch {}
  }

  const aplicarRespuestaToken = async (tokenResponse, notificar = false) => {
    limpiarSesion()
    const revision = revisionSesion
    if (tokenResponse?.error || !tokenResponse?.access_token) {
      if (notificar) error(`Error token: ${tokenResponse?.error || 'sin access_token'}`)
      return false
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      // El hint de OAuth no impide elegir otra cuenta. Comprobar al propietario
      // con el mismo permiso drive.file, antes de habilitar backups o imágenes.
      const respuesta = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        signal: controller.signal
      })
      if (!respuesta.ok) throw new Error('No se pudo verificar la cuenta de Google Drive. Volvé a conectar.')
      const perfil = await respuesta.json()
      const correo = (perfil.user?.emailAddress || '').trim().toLowerCase()
      if (!correo) throw new Error('Google no informó la cuenta conectada. Volvé a conectar.')
      if (CORREO_DRIVE && correo !== CORREO_DRIVE) {
        throw new Error(`Para guardar los datos del taller, conectá ${CORREO_DRIVE}. La cuenta elegida no es la configurada.`)
      }
      if (revision !== revisionSesion) return false

      accessToken.value = tokenResponse.access_token
      tokenVerificado = tokenResponse.access_token
      cuentaGoogleDrive.value = correo
      const expiresIn = Number(tokenResponse.expires_in) || 3600
      tokenExpiry.value = String(Date.now() + expiresIn * 1000)
      guardarLocalSeguro('google_token_expiry', tokenExpiry.value)
      window.gapi.client.setToken({ access_token: tokenResponse.access_token })
      isAuthenticated.value = true
      if (notificar) success(`Google Drive conectado: ${correo}`)
      return true
    } catch (err) {
      if (revision === revisionSesion) {
        limpiarSesion()
        error(err.name === 'AbortError' ? 'No se pudo verificar la cuenta a tiempo. Volvé a conectar Google Drive.' : err.message)
      }
      return false
    } finally { clearTimeout(timeout) }
  }

  const solicitarToken = (prompt = '', notificar = false) => {
    if (solicitudTokenEnCurso) return solicitudTokenEnCurso
    limpiarSesion()
    const revisionSolicitud = revisionSesion
    solicitudTokenEnCurso = new Promise((resolve) => {
      if (!tokenClient.value) return resolve(false)

      let finalizado = false
      let timeout
      const finalizar = (resultado) => {
        if (finalizado) return
        finalizado = true
        clearTimeout(timeout)
        resolve(resultado)
      }

      tokenClient.value.callback = async (respuesta) => {
        if (finalizado) return
        if (revisionSolicitud !== revisionSesion) return finalizar(false)
        // La verificación tiene su propio límite y no debe finalizar antes que
        // el resultado de la conexión ni habilitar respuestas OAuth tardías.
        clearTimeout(timeout)
        finalizar(await aplicarRespuestaToken(respuesta, notificar))
      }
      tokenClient.value.error_callback = (respuesta) => {
        if (notificar) error(`No se pudo conectar Google Drive: ${respuesta?.type || 'error desconocido'}`)
        finalizar(false)
      }

      timeout = setTimeout(() => {
        if (notificar) error('La conexión demoró demasiado. Intentá conectar Google Drive nuevamente.')
        finalizar(false)
      }, notificar ? 120000 : 15000)
      try {
        tokenClient.value.requestAccessToken({ prompt, ...(CORREO_DRIVE ? { login_hint: CORREO_DRIVE } : {}) })
      } catch (err) {
        if (notificar) error(`No se pudo conectar Google Drive: ${err.message}`)
        finalizar(false)
      }
    }).finally(() => { solicitudTokenEnCurso = null })
    return solicitudTokenEnCurso
  }

  // ===== Helpers generales =====
  const diagnosticarProblemas = () => {
    if (typeof window.gapi === 'undefined') {
      console.error('❌ Google API no cargada'); return false
    }
    if (typeof window.google === 'undefined') {
      console.error('❌ Google Identity Services no cargado'); return false
    }
    if (!CLIENT_ID) {
      console.error('❌ CLIENT_ID no definido'); return false
    }
    return true
  }

  const waitForGoogleLibraries = () =>
    new Promise((resolve, reject) => {
      let attempts = 0
      const max = 100
      const check = () => {
        if (window.gapi && window.google && window.google.accounts) return resolve()
        if (++attempts >= max) return reject(new Error('Timeout esperando librerías de Google'))
        setTimeout(check, 100)
      }
      check()
    })

  // Nunca exponer un token cuya cuenta no se haya comprobado.
  const currentAccessToken = () => {
    return tokenVerificado === accessToken.value && cuentaGoogleDrive.value ? accessToken.value : null
  }

  // Usar la expiración absoluta de la respuesta OAuth verificada.
  const tokenProximoAExpirar = () => {
    if (!tokenExpiry.value) return true
    const ahora = Date.now()
    const exp = parseInt(tokenExpiry.value)
    // Renovar con un margen de cinco minutos.
    return (exp - ahora) <= 5 * 60 * 1000
  }

  const renovarTokenSiEsNecesario = async () => {
    if (estaAutenticado()) return true
    if (!tokenClient.value) return false
    return solicitarToken('', false)
  }

  const asegurarTokenValido = async () => {
    if (estaAutenticado()) return true
    if (!tokenClient.value) return false
    const renovado = await solicitarToken('', false)
    return renovado && estaAutenticado()
  }

  // ===== Inicialización / Autenticación =====
  const initializeGoogleDrive = async () => {
    try {
      if (isInitialized.value && tokenClient.value) return true
      if (!CLIENT_ID) throw new Error('CLIENT_ID no definido en .env')
      if (!diagnosticarProblemas()) throw new Error('Diagnóstico inicial falló')

      await waitForGoogleLibraries()

      await Promise.race([
        new Promise((resolve, reject) => {
          window.gapi.load('client', { callback: resolve, onerror: () => reject(new Error('Error al cargar gapi.client')) })
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout cargando gapi.client')), 10000))
      ])

      await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] })

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services no disponible')
      }

      tokenClient.value = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        ...(CORREO_DRIVE ? { login_hint: CORREO_DRIVE } : {}),
        callback: (tokenResponse) => { void aplicarRespuestaToken(tokenResponse, true) },
        error_callback: (e) => {
          error(`Error en autenticación: ${e?.type || 'desconocido'}`)
        }
      })

      isInitialized.value = true
      initializationError.value = null
      return true
    } catch (err) {
      initializationError.value = err.message
      error(`Error al inicializar Google Drive: ${err.message}`)
      return false
    }
  }

  const authenticateUser = async () => {
    try {
      if (!isInitialized.value) {
        const ok = await initializeGoogleDrive()
        if (!ok) throw new Error('No se pudo inicializar Google Drive')
      }
      if (!tokenClient.value) throw new Error('TokenClient no disponible')

      // Reutilizar el permiso concedido; Google pedirá consentimiento cuando
      // realmente sea necesario (primer acceso o autorización revocada).
      return await solicitarToken('', true)
    } catch (err) {
      error(`Error al autenticar: ${err.message}`)
      return false
    }
  }

  // Verificación de autenticación (optimizada)
  const estaAutenticado = () => {
    try {
      return Boolean(isAuthenticated.value && cuentaGoogleDrive.value &&
        (!CORREO_DRIVE || cuentaGoogleDrive.value === CORREO_DRIVE) &&
        accessToken.value && tokenVerificado === accessToken.value &&
        window.gapi?.client?.getToken?.()?.access_token === tokenVerificado &&
        !tokenProximoAExpirar())
    } catch { return false }
  }

  // ===== Carpetas =====
  const crearCarpeta = async (name, parentId = null) => {
    if (!await asegurarTokenValido()) throw new Error('Conectá la cuenta de Google Drive del taller primero')
    const metadata = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined }
    const res = await window.gapi.client.drive.files.create({ resource: metadata })
    return res.result.id
  }

  const buscarCarpeta = async (name) => {
    if (!await asegurarTokenValido()) throw new Error('Conectá la cuenta de Google Drive del taller primero')
    const res = await window.gapi.client.drive.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive'
    })
    return res.result.files.length > 0 ? res.result.files[0] : null
  }

  // ===== Subidas/Descargas =====
  const subirArchivo = async (nombre, contenido, carpetaId = null, tipoMime = 'text/html') => {
    try {
      const ok = await asegurarTokenValido()
      if (!ok) throw new Error('Token inválido o expirado')

      const metadata = { name: nombre, parents: carpetaId ? [carpetaId] : undefined }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      if (contenido instanceof File || contenido instanceof Blob) {
        form.append('file', contenido)
      } else {
        form.append('file', new Blob([contenido], { type: tipoMime }))
      }

      // 1er intento
      let response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentAccessToken()}` },
        body: form
      })

      // retry 401 silencioso
      if (response.status === 401 && tokenClient?.value) {
        const renovado = await solicitarToken('', false)
        if (!renovado) throw new Error('La sesión de Google Drive venció. Vuelve a conectarla.')
        response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentAccessToken()}` },
          body: form
        })
      }

      if (!response.ok) {
        const txt = await response.text()
        throw new Error(`Error HTTP ${response.status}: ${txt}`)
      }

      const result = await response.json()
      return {
        id: result.id,
        name: result.name,
        webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
        thumbnailLink: result.thumbnailLink
      }
    } catch (err) {
      console.error('❌ Error al subir archivo:', err)
      throw err
    }
  }

  const descargarBackupDeGoogleDrive = async (fileId, nombreArchivo, descargarArchivo = true) => {
    try {
      const ok = await asegurarTokenValido()
      if (!ok) throw new Error('Token inválido o expirado')

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${currentAccessToken()}` }
      })
      if (!response.ok) throw new Error(`Error HTTP ${response.status}: ${response.statusText}`)

      const contenido = await response.text()
      if (descargarArchivo) {
        const blob = new Blob([contenido], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = nombreArchivo
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
        success(`Backup descargado: ${nombreArchivo}`)
      }
      return { success: true, contenido }
    } catch (err) {
      error(`Error al descargar backup: ${err.message}`); return { success: false, error: err.message }
    }
  }

  const eliminarBackupDeGoogleDrive = async (fileId, nombreArchivo) => {
    try {
      const ok = await asegurarTokenValido()
      if (!ok) throw new Error('Token inválido o expirado')

      await window.gapi.client.drive.files.delete({ fileId })
      success(`Backup eliminado de Google Drive: ${nombreArchivo}`)
      return { success: true }
    } catch (err) {
      error(`Error al eliminar backup: ${err.message}`); return { success: false, error: err.message }
    }
  }

  // ===== Flujos específicos (tu código original, conservado) =====
  const buscarOCrearCarpetaOrden = async (numeroOrden) => {
    let carpetaPrincipal = await buscarCarpeta('Ordenes de Mantenimiento - AutoService')
    if (!carpetaPrincipal) {
      const id = await crearCarpeta('Ordenes de Mantenimiento - AutoService')
      carpetaPrincipal = { id }
    }
    const nombreCarpetaOrden = `Orden_${numeroOrden}`
    const resp = await window.gapi.client.drive.files.list({
      q: `name='${nombreCarpetaOrden}' and mimeType='application/vnd.google-apps.folder' and '${carpetaPrincipal.id}' in parents and trashed=false`,
      spaces: 'drive'
    })
    let carpetaOrden
    if (resp.result.files.length > 0) carpetaOrden = resp.result.files[0]
    else {
      const id = await crearCarpeta(nombreCarpetaOrden, carpetaPrincipal.id)
      carpetaOrden = { id }
    }
    return carpetaOrden
  }

  const subirImagen = async (archivo, numeroOrden, descripcion = '') => {
    try {
      if (!estaAutenticado()) throw new Error('No estás autenticado con Google Drive')
      if (!archivo.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen')
      if (archivo.size > 5 * 1024 * 1024) throw new Error('La imagen no puede ser mayor a 5MB')

      const carpetaOrden = await buscarOCrearCarpetaOrden(numeroOrden)
      const ext = archivo.name.split('.').pop() || 'jpg'
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const nombreArchivo = `${numeroOrden}_foto_${ts}${descripcion ? '_' + descripcion.replace(/[^a-zA-Z0-9]/g, '_') : ''}.${ext}`

      const res = await subirArchivo(nombreArchivo, archivo, carpetaOrden.id, archivo.type)
      success('Imagen subida exitosamente a Google Drive')
      return { success: true, fileId: res.id, fileName: res.name, webViewLink: res.webViewLink, thumbnailLink: res.thumbnailLink, uploadedAt: new Date().toISOString() }
    } catch (err) {
      let msg = err.message || 'Error desconocido'
      if (msg.includes('401')) msg = 'Token expirado. Vuelve a autenticarte.'
      error(`Error al subir imagen: ${msg}`)
      return { success: false, error: msg }
    }
  }

  const subirOrdenAGoogleDrive = async (orden, contenidoHTML) => {
    try {
      if (!estaAutenticado()) throw new Error('No estás autenticado con Google Drive')
      let carpeta = await buscarCarpeta('Ordenes de Mantenimiento - AutoService')
      if (!carpeta) {
        const id = await crearCarpeta('Ordenes de Mantenimiento - AutoService')
        carpeta = { id }
      }
      const nombre = `${orden.numeroOrden} - ${orden.cliente?.nombre || 'Sin Cliente'}.html`
      const archivo = await subirArchivo(nombre, contenidoHTML, carpeta.id)
      success(`Orden ${orden.numeroOrden} guardada en Google Drive`)
      return { success: true, fileId: archivo.id, fileName: archivo.name, webViewLink: archivo.webViewLink }
    } catch (err) {
      let msg = err.message || 'Error desconocido'
      if (msg.includes('401')) msg = 'Token expirado. Vuelve a autenticarte.'
      error(`Error al guardar en Google Drive: ${msg}`)
      return { success: false, error: msg }
    }
  }

  // === APIs usadas por backups y reportes (compat) ===
  const subirArchivoAGoogleDrive = async (archivo, nombreArchivo, opciones = {}) => {
    try {
      if (!estaAutenticado()) throw new Error('No estás autenticado con Google Drive')
      let carpetaId = null
      if (opciones.carpeta) {
        let carpeta = await buscarCarpeta(opciones.carpeta)
        if (!carpeta) carpetaId = await crearCarpeta(opciones.carpeta)
        else carpetaId = carpeta.id
      }
      const res = await subirArchivo(nombreArchivo, archivo, carpetaId, archivo.type || 'text/csv')
      return { success: true, fileId: res.id, fileName: res.name, webViewLink: res.webViewLink }
    } catch (err) {
      let msg = err.message || 'Error desconocido'
      if (msg.includes('401')) msg = 'Token expirado. Vuelve a autenticarte.'
      error(`Error al subir archivo: ${msg}`)
      return { success: false, error: msg }
    }
  }

  const subirBackupCompletoAGoogleDrive = async (datosBackup, nombreArchivo) => {
    try {
      const ok = await asegurarTokenValido()
      if (!ok) throw new Error('Token de autenticación inválido o expirado. Vuelve a conectar Google Drive.')
      let carpeta = await buscarCarpeta('AutoService - Backups')
      if (!carpeta) {
        const id = await crearCarpeta('AutoService - Backups')
        carpeta = { id }
      }
      const backupCompleto = {
        ...datosBackup,
        metadata: {
          ...datosBackup.metadata,
          uploadedToGoogleDrive: true,
          googleDriveUploadDate: new Date().toISOString(),
          autoServiceVersion: '1.0.0'
        }
      }
      const contenidoJSON = JSON.stringify(backupCompleto, null, 2)
      const archivo = await subirArchivo(nombreArchivo, contenidoJSON, carpeta.id, 'application/json')

      // Mantener una rotación simple: la copia actual y la inmediatamente anterior.
      // Esto evita que el Drive del taller acumule cientos de archivos automáticos.
      try {
        const lista = await window.gapi.client.drive.files.list({
          q: `'${carpeta.id}' in parents and trashed=false and name contains 'backup-autoservice'`,
          orderBy: 'modifiedTime desc',
          pageSize: 100,
          fields: 'files(id, name, modifiedTime)'
        })
        const backupsAntiguos = (lista.result.files || []).slice(2)
        await Promise.all(
          backupsAntiguos.map((backup) => window.gapi.client.drive.files.delete({ fileId: backup.id }))
        )
      } catch (rotationError) {
        console.warn('No se pudieron eliminar backups antiguos de Google Drive:', rotationError)
      }

      success(`Backup guardado en Google Drive: ${nombreArchivo}`)
      return { success: true, fileId: archivo.id, fileName: archivo.name, webViewLink: archivo.webViewLink, uploadedAt: new Date().toISOString() }
    } catch (err) {
      error(`Error al subir backup: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  const listarBackupsEnGoogleDrive = async () => {
    try {
      const ok = await asegurarTokenValido()
      if (!ok) throw new Error('Token de autenticación inválido o expirado. Vuelve a conectar Google Drive.')
      const carpeta = await buscarCarpeta('AutoService - Backups')
      if (!carpeta) return []
      const resp = await window.gapi.client.drive.files.list({
        q: `'${carpeta.id}' in parents and trashed=false and name contains 'backup-autoservice'`,
        orderBy: 'modifiedTime desc',
        fields: 'files(id, name, modifiedTime, size, webViewLink)'
      })
      return (resp.result.files || []).map(f => ({
        id: f.id,
        nombre: f.name,
        fecha: new Date(f.modifiedTime).toLocaleString('es-ES'),
        tamaño: f.size ? `${(f.size / 1024).toFixed(2)} KB` : 'Desconocido',
        enlace: f.webViewLink
      }))
    } catch (err) {
      error('Error al obtener lista de backups de Google Drive'); return []
    }
  }

  const cerrarSesion = () => {
    try {
      // Desconectar la sesión local no debe revocar los permisos concedidos.
      // El usuario puede retirarlos desde la configuración de su cuenta Google.
      limpiarSesion()
      refreshToken.value = null
      eliminarLocalSeguro('google_refresh_token')
      success('Sesión cerrada correctamente')
    } catch (err) {
      error('Error al cerrar sesión')
    }
  }

  const getDebugInfo = () => ({
    isInitialized: isInitialized.value,
    isAuthenticated: isAuthenticated.value,
    hasAccessToken: !!accessToken.value,
    hasTokenClient: !!tokenClient.value,
    clientId: CLIENT_ID,
    initializationError: initializationError.value,
    gapiLoaded: typeof window.gapi !== 'undefined',
    googleLoaded: typeof window.google !== 'undefined'
  })

  return {
    // Estado
    isInitialized,
    isAuthenticated,
    initializationError,
    accessToken,
    cuentaGoogleDrive,
    correoGoogleDriveConfigurado: CORREO_DRIVE,

    // Inicialización / Auth
    initializeGoogleDrive,
    authenticateUser,
    cerrarSesion,
    estaAutenticado,
    asegurarTokenValido,
    tokenProximoAExpirar,
    renovarTokenSiEsNecesario,

    // Helpers
    diagnosticarProblemas,
    getDebugInfo,
    currentAccessToken,

    // Drive ops / flujos
    crearCarpeta,
    buscarCarpeta,
    subirArchivo,
    subirImagen,
    subirOrdenAGoogleDrive,
    subirArchivoAGoogleDrive,        // ⚠️ usado por reportes CSV
    subirBackupCompletoAGoogleDrive, // ⚠️ usado por backup total
    listarBackupsEnGoogleDrive,
    descargarBackupDeGoogleDrive,
    eliminarBackupDeGoogleDrive
  }
}
