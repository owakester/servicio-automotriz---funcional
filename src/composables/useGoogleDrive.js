// src/composables/useGoogleDrive.js
import { ref } from 'vue'
import { useNotifications } from './useNotifications'

export const useGoogleDrive = () => {
  const { success, error } = useNotifications()

  // Configuración
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  const SCOPES = 'https://www.googleapis.com/auth/drive.file'

  // Estado
  const isInitialized = ref(false)
  const isAuthenticated = ref(false)
  const accessToken = ref(null)
  // Mantengo estos dos por compatibilidad (pero no los necesito para funcionar)
  const refreshToken = ref(localStorage.getItem('google_refresh_token') || null)
  const tokenExpiry = ref(localStorage.getItem('google_token_expiry') || null)
  const tokenClient = ref(null)
  const initializationError = ref(null)

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

  // Token siempre “fresco” desde gapi
  const currentAccessToken = () => {
    try {
      const t = window?.gapi?.client?.getToken?.()
      if (t && t.access_token) return t.access_token
    } catch {}
    return accessToken.value
  }

  // ¿está por vencer? (margen 60s) — usa info de gapi si existe
  const tokenProximoAExpirar = () => {
    try {
      const t = window?.gapi?.client?.getToken?.()
      const nowMs = Date.now()
      if (t && typeof t.expires_at === 'number') return (t.expires_at - nowMs) <= 60_000
      if (t && typeof t.expires_in === 'number') return (t.expires_in * 1000) <= 60_000
    } catch {}
    if (!tokenExpiry.value) return true
    const ahora = Date.now()
    const exp = parseInt(tokenExpiry.value)
    // margen generoso del original: 5 min
    return (exp - ahora) <= 5 * 60 * 1000
  }

  const renovarTokenSiEsNecesario = async () => {
    if (!tokenProximoAExpirar()) return true
    if (!tokenClient.value) return false
    return new Promise((resolve) => {
      let done = false
      tokenClient.value.requestAccessToken({
        prompt: '',
        callback: (resp) => {
          if (resp?.access_token && !resp?.error) {
            // refresco ok
            const expiresIn = resp.expires_in || 3600
            accessToken.value = resp.access_token
            tokenExpiry.value = String(Date.now() + expiresIn * 1000)
            localStorage.setItem('google_token_expiry', tokenExpiry.value)
            isAuthenticated.value = true
            window.gapi.client.setToken({ access_token: resp.access_token })
            done = true
            resolve(true)
          } else {
            resolve(false)
          }
        }
      })
      setTimeout(() => { if (!done) resolve(false) }, 10000)
    })
  }

  const asegurarTokenValido = async () => {
    // Si gapi ya tiene token, sincronizá estado local
    if (!isAuthenticated.value) {
      try {
        const t = window?.gapi?.client?.getToken?.()
        if (t?.access_token) {
          accessToken.value = t.access_token
          isAuthenticated.value = true
        }
      } catch {}
    }

    // Refresh proactivo si vence pronto
    await renovarTokenSiEsNecesario()

    // Asegurar que gapi tenga el token actual
    try {
      const t = window?.gapi?.client?.getToken?.()
      const token = t?.access_token || accessToken.value
      if (token) {
        window.gapi.client.setToken({ access_token: token })
        accessToken.value = token
        isAuthenticated.value = true
        return true
      }
    } catch {}

    accessToken.value = null
    isAuthenticated.value = false
    return false
  }

  // ===== Inicialización / Autenticación =====
  const initializeGoogleDrive = async () => {
    try {
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
        callback: (tokenResponse) => {
          if (tokenResponse?.error || !tokenResponse?.access_token) {
            error(`Error token: ${tokenResponse?.error || 'sin access_token'}`)
            return
          }
          accessToken.value = tokenResponse.access_token
          const expiresIn = tokenResponse.expires_in || 3600
          tokenExpiry.value = String(Date.now() + expiresIn * 1000)
          localStorage.setItem('google_token_expiry', tokenExpiry.value)
          if (tokenResponse.refresh_token) {
            refreshToken.value = tokenResponse.refresh_token
            localStorage.setItem('google_refresh_token', refreshToken.value)
          }
          isAuthenticated.value = true
          window.gapi.client.setToken({ access_token: tokenResponse.access_token })
          success('Autenticación exitosa con Google Drive')
        },
        error_callback: (e) => {
          error(`Error en autenticación: ${e?.type || 'desconocido'}`)
        }
      })

      isInitialized.value = true
      initializationError.value = null
      success('Google Drive API inicializada correctamente')
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

      tokenClient.value.requestAccessToken({ prompt: 'consent' })
      return true
    } catch (err) {
      error(`Error al autenticar: ${err.message}`)
      return false
    }
  }

  // Verificación de autenticación (optimizada)
  const estaAutenticado = () => {
    const hasGapi = !!(window.gapi && window.gapi.client)
    const hasLocal = !!accessToken.value
    const tokenValido = !tokenProximoAExpirar()
    let gapiTokenSet = false
    let gapiToken = null

    if (hasGapi) {
      try {
        const t = window.gapi.client.getToken()
        gapiTokenSet = !!(t && t.access_token)
        gapiToken = t?.access_token || null
      } catch {}
    }

    // Sincronizaciones suaves
    if (!hasLocal && gapiToken && hasGapi && tokenValido) {
      accessToken.value = gapiToken
      isAuthenticated.value = true
    }
    if (hasLocal && !gapiTokenSet && hasGapi && tokenValido) {
      try { window.gapi.client.setToken({ access_token: accessToken.value }); gapiTokenSet = true } catch {}
    }

    return hasGapi && (hasLocal || gapiTokenSet) && tokenValido
  }

  // ===== Carpetas =====
  const crearCarpeta = async (name, parentId = null) => {
    const metadata = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined }
    const res = await window.gapi.client.drive.files.create({ resource: metadata })
    return res.result.id
  }

  const buscarCarpeta = async (name) => {
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
        await new Promise((resolve) => {
          let done = false
          tokenClient.value.requestAccessToken({ prompt: '', callback: () => { done = true; resolve() } })
          setTimeout(() => { if (!done) resolve() }, 2500)
        })
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

  const descargarBackupDeGoogleDrive = async (fileId, nombreArchivo) => {
    try {
      const ok = await asegurarTokenValido()
      if (!ok) throw new Error('Token inválido o expirado')

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${currentAccessToken()}` }
      })
      if (!response.ok) throw new Error(`Error HTTP ${response.status}: ${response.statusText}`)

      const contenido = await response.text()
      const blob = new Blob([contenido], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = nombreArchivo
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)

      success(`Backup descargado: ${nombreArchivo}`)
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
      if (accessToken.value) {
        window.google?.accounts?.oauth2?.revoke?.(accessToken.value, () => {})
      }
      accessToken.value = null
      refreshToken.value = null
      tokenExpiry.value = null
      isAuthenticated.value = false
      localStorage.removeItem('google_refresh_token')
      localStorage.removeItem('google_token_expiry')
      try { window.gapi?.client?.setToken?.(null) } catch {}
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
