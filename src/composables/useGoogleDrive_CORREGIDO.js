import { ref } from 'vue'
import { useNotifications } from './useNotifications'

export const useGoogleDrive = () => {
  const { success, error } = useNotifications()

  // Configuración usando variables de entorno
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  const SCOPES = 'https://www.googleapis.com/auth/drive.file'

  // Estado
  const isInitialized = ref(false)
  const isAuthenticated = ref(false)
  const accessToken = ref(null)
  const tokenClient = ref(null)
  const initializationError = ref(null)

  // Función de diagnóstico
  const diagnosticarProblemas = () => {
    console.log('=== DIAGNÓSTICO GOOGLE DRIVE ===')
    console.log('1. window.gapi:', typeof window.gapi !== 'undefined')
    console.log('2. window.google:', typeof window.google !== 'undefined')
    console.log('3. CLIENT_ID:', CLIENT_ID)
    console.log('4. Dominio actual:', window.location.origin)
    console.log('5. Variables de entorno disponibles:', {
      CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      APP_NAME: import.meta.env.VITE_APP_NAME
    })
    
    if (typeof window.gapi === 'undefined') {
      console.error('❌ Google API no cargada. Verifica la conexión a internet.')
      return false
    }
    
    if (typeof window.google === 'undefined') {
      console.error('❌ Google Identity Services no cargado.')
      return false
    }
    
    if (!CLIENT_ID) {
      console.error('❌ CLIENT_ID no definido en variables de entorno.')
      return false
    }
    
    console.log('✅ Todas las dependencias están disponibles')
    return true
  }

  // Esperar a que las librerías de Google se carguen con timeout
  const waitForGoogleLibraries = () => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 10 segundos máximo
      
      const checkLibraries = () => {
        attempts++
        
        if (window.gapi && window.google && window.google.accounts) {
          console.log('✅ Librerías de Google cargadas correctamente')
          resolve()
        } else if (attempts >= maxAttempts) {
          const missing = []
          if (!window.gapi) missing.push('gapi')
          if (!window.google) missing.push('google')
          if (!window.google?.accounts) missing.push('google.accounts')
          
          reject(new Error(`Timeout esperando librerías de Google. Faltantes: ${missing.join(', ')}`))
        } else {
          setTimeout(checkLibraries, 100)
        }
      }
      
      checkLibraries()
    })
  }

  // Inicializar Google Identity Services
  const initializeGoogleDrive = async () => {
    try {
      console.log('🔄 Iniciando inicialización de Google Drive...')
      
      // Verificar variables de entorno
      if (!CLIENT_ID) {
        throw new Error('CLIENT_ID no está definido en las variables de entorno (.env)')
      }

      // Ejecutar diagnóstico
      if (!diagnosticarProblemas()) {
        throw new Error('Falló el diagnóstico inicial')
      }

      // Esperar a que las librerías se carguen
      await waitForGoogleLibraries()

      // Inicializar Google API Client con timeout
      console.log('🔄 Inicializando Google API Client...')
      await Promise.race([
        new Promise((resolve, reject) => {
          window.gapi.load('client', {
            callback: resolve,
            onerror: () => reject(new Error('Error al cargar gapi.client'))
          })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout cargando gapi.client')), 10000)
        )
      ])

      // Inicializar el cliente con la API de Drive
      await window.gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC]
      })

      console.log('✅ Google API Client inicializado')

      // Inicializar Google Identity Services
      console.log('🔄 Inicializando Google Identity Services...')
      tokenClient.value = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          console.log('📝 Respuesta del token:', tokenResponse)
          
          if (tokenResponse.error) {
            console.error('❌ Error en token:', tokenResponse.error)
            error(`Error al obtener token: ${tokenResponse.error}`)
            return
          }
          
          if (!tokenResponse.access_token) {
            console.error('❌ No se recibió access_token')
            error('No se recibió token de acceso')
            return
          }
          
          accessToken.value = tokenResponse.access_token
          isAuthenticated.value = true
          
          // Configurar el token en gapi
          window.gapi.client.setToken({
            access_token: tokenResponse.access_token
          })
          
          console.log('✅ Autenticación exitosa')
          success('Autenticación exitosa con Google Drive')
        },
        error_callback: (error) => {
          console.error('❌ Error en autenticación:', error)
          
          if (error.type === 'popup_closed') {
            error('Autenticación cancelada por el usuario')
          } else if (error.type === 'popup_failed_to_open') {
            error('No se pudo abrir la ventana de autenticación. Verifica que los popups estén habilitados.')
          } else if (error.type === 'idpiframe_initialization_failed') {
            error('Error de inicialización. Verifica que el dominio esté autorizado en Google Cloud Console.')
          } else {
            error(`Error en la autenticación: ${error.type || 'Error desconocido'}`)
          }
        }
      })

      if (!tokenClient.value) {
        throw new Error('No se pudo inicializar tokenClient')
      }

      isInitialized.value = true
      initializationError.value = null
      console.log('✅ Google Drive API inicializada correctamente')
      success('Google Drive API inicializada correctamente')
      return true

    } catch (err) {
      console.error('❌ Error al inicializar Google Drive:', err)
      initializationError.value = err.message
      
      // Dar consejos específicos según el error
      if (err.message.includes('CLIENT_ID')) {
        error('Error: Verifica la configuración del CLIENT_ID en el archivo .env')
      } else if (err.message.includes('Timeout') || err.message.includes('Faltantes')) {
        error('Error: No se pudieron cargar las librerías de Google. Verifica tu conexión a internet.')
      } else if (err.message.includes('idpiframe_initialization_failed')) {
        error('Error: Dominio no autorizado. Configura tu dominio en Google Cloud Console.')
      } else {
        error(`Error al inicializar Google Drive: ${err.message}`)
      }
      
      return false
    }
  }

  // Autenticar usuario
  const authenticateUser = async () => {
    try {
      console.log('🔄 Iniciando autenticación de usuario...')
      
      if (!isInitialized.value) {
        console.log('🔄 Inicializando primero...')
        const initialized = await initializeGoogleDrive()
        if (!initialized) {
          throw new Error('No se pudo inicializar Google Drive')
        }
      }

      if (isAuthenticated.value && accessToken.value) {
        console.log('✅ Usuario ya autenticado')
        success('Ya estás autenticado con Google Drive')
        return true
      }

      if (!tokenClient.value) {
        throw new Error('TokenClient no está disponible')
      }

      console.log('🔄 Solicitando token de acceso...')
      // Solicitar token con prompt para asegurar consentimiento
      tokenClient.value.requestAccessToken({
        prompt: 'consent'
      })

      // La autenticación se completa en el callback
      // Retornamos true ya que la solicitud se envió correctamente
      return true

    } catch (err) {
      console.error('❌ Error en autenticación:', err)
      error(`Error al autenticar: ${err.message}`)
      return false
    }
  }

  // Verificar si está autenticado (VERSIÓN CORREGIDA)
  const estaAutenticado = () => {
    // Verificación completa del estado de autenticación
    const hasGapiClient = window.gapi && window.gapi.client
    const hasToken = !!accessToken.value
    const isAuthStateValid = isAuthenticated.value
    
    // Verificar si el token está configurado en gapi
    let gapiTokenSet = false
    if (hasGapiClient) {
      try {
        const currentToken = window.gapi.client.getToken()
        gapiTokenSet = !!(currentToken && currentToken.access_token)
      } catch (e) {
        console.warn('⚠️ Error verificando token en gapi:', e)
      }
    }
    
    const autenticado = hasGapiClient && hasToken && isAuthStateValid && gapiTokenSet
    
    console.log('🔍 Estado de autenticación detallado:', {
      hasGapiClient,
      hasToken,
      isAuthStateValid,
      gapiTokenSet,
      resultado: autenticado
    })
    
    // Si hay inconsistencias, intentar reparar
    if (hasToken && isAuthStateValid && hasGapiClient && !gapiTokenSet) {
      console.log('🔧 Reparando estado de token en gapi...')
      try {
        window.gapi.client.setToken({
          access_token: accessToken.value
        })
        console.log('✅ Token reparado en gapi')
        return true
      } catch (e) {
        console.error('❌ Error reparando token:', e)
        return false
      }
    }
    
    // Si no está autenticado pero tenemos tokenClient, intentar renovar
    if (!autenticado && tokenClient.value && isInitialized.value) {
      console.log('🔄 Intentando renovar autenticación automáticamente...')
      // No hacer esto automáticamente en producción, solo para debug
      // tokenClient.value.requestAccessToken({ prompt: '' })
    }
    
    return autenticado
  }

  // Crear carpeta en Google Drive
  const crearCarpeta = async (nombre, padreId = null) => {
    try {
      console.log(`🔄 Creando carpeta: ${nombre}`)
      
      const metadata = {
        name: nombre,
        mimeType: 'application/vnd.google-apps.folder',
        parents: padreId ? [padreId] : undefined
      }

      const response = await window.gapi.client.drive.files.create({
        resource: metadata
      })

      console.log('✅ Carpeta creada:', response.result)
      return response.result.id
    } catch (err) {
      console.error('❌ Error al crear carpeta:', err)
      throw err
    }
  }

  // Buscar carpeta
  const buscarCarpeta = async (nombre) => {
    try {
      console.log(`🔍 Buscando carpeta: ${nombre}`)
      
      const response = await window.gapi.client.drive.files.list({
        q: `name='${nombre}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive'
      })

      const carpeta = response.result.files.length > 0 ? response.result.files[0] : null
      console.log('📁 Resultado búsqueda carpeta:', carpeta)
      return carpeta
    } catch (err) {
      console.error('❌ Error al buscar carpeta:', err)
      throw err
    }
  }

  // Subir archivo a Google Drive
  const subirArchivo = async (nombre, contenido, carpetaId = null, tipoMime = 'text/html') => {
    try {
      console.log(`🔄 Subiendo archivo: ${nombre}`)
      
      if (!accessToken.value) {
        throw new Error('No hay token de acceso disponible')
      }

      const metadata = {
        name: nombre,
        parents: carpetaId ? [carpetaId] : undefined
      }

      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      
      // Manejar diferentes tipos de contenido
      if (contenido instanceof File || contenido instanceof Blob) {
        form.append('file', contenido)
      } else {
        form.append('file', new Blob([contenido], { type: tipoMime }))
      }

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.value}`
        },
        body: form
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Archivo subido:', result)
      
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

  // Subir imagen a Google Drive (VERSIÓN CORREGIDA)
  const subirImagen = async (archivo, numeroOrden, descripcion = '') => {
    try {
      console.log(`🔄 Subiendo imagen para orden ${numeroOrden}`)
      
      // Verificar autenticación justo antes de subir
      console.log('🔍 Verificando autenticación antes de subir...')
      if (!estaAutenticado()) {
        console.error('❌ No autenticado al momento de subir')
        throw new Error('No estás autenticado con Google Drive. Reconecta y vuelve a intentar.')
      }

      // Validar que es una imagen
      if (!archivo.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen')
      }

      // Limitar tamaño (5MB)
      if (archivo.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no puede ser mayor a 5MB')
      }

      // Buscar o crear carpeta de la orden
      const carpetaOrden = await buscarOCrearCarpetaOrden(numeroOrden)
      
      // Generar nombre único para la imagen
      const extension = archivo.name.split('.').pop() || 'jpg'
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const nombreArchivo = `${numeroOrden}_foto_${timestamp}${descripcion ? '_' + descripcion.replace(/[^a-zA-Z0-9]/g, '_') : ''}.${extension}`

      // Subir imagen
      const resultado = await subirArchivo(nombreArchivo, archivo, carpetaOrden.id, archivo.type)

      console.log('✅ Imagen subida exitosamente')
      success(`Imagen subida exitosamente a Google Drive`)
      
      return {
        success: true,
        fileId: resultado.id,
        fileName: resultado.name,
        webViewLink: resultado.webViewLink,
        thumbnailLink: resultado.thumbnailLink,
        uploadedAt: new Date().toISOString()
      }

    } catch (err) {
      console.error('❌ Error al subir imagen:', err)
      
      let mensajeError = 'Error desconocido'
      if (err.message.includes('imagen')) {
        mensajeError = err.message
      } else if (err.message.includes('401')) {
        mensajeError = 'Token expirado. Vuelve a autenticarte.'
      } else if (err.message.includes('403')) {
        mensajeError = 'Sin permisos para subir archivos.'
      } else if (err.message.includes('autenticado')) {
        mensajeError = err.message
      } else {
        mensajeError = err.message
      }
      
      error(`Error al subir imagen: ${mensajeError}`)
      return { success: false, error: mensajeError }
    }
  }

  // Buscar o crear carpeta específica para una orden
  const buscarOCrearCarpetaOrden = async (numeroOrden) => {
    try {
      // Primero buscar la carpeta principal
      let carpetaPrincipal = await buscarCarpeta('Ordenes de Mantenimiento - AutoService')
      if (!carpetaPrincipal) {
        const carpetaId = await crearCarpeta('Ordenes de Mantenimiento - AutoService')
        carpetaPrincipal = { id: carpetaId }
      }

      // Buscar carpeta de la orden específica
      const nombreCarpetaOrden = `Orden_${numeroOrden}`
      const response = await window.gapi.client.drive.files.list({
        q: `name='${nombreCarpetaOrden}' and mimeType='application/vnd.google-apps.folder' and '${carpetaPrincipal.id}' in parents and trashed=false`,
        spaces: 'drive'
      })

      let carpetaOrden
      if (response.result.files.length > 0) {
        carpetaOrden = response.result.files[0]
      } else {
        // Crear carpeta de la orden
        const carpetaId = await crearCarpeta(nombreCarpetaOrden, carpetaPrincipal.id)
        carpetaOrden = { id: carpetaId }
      }

      return carpetaOrden
    } catch (err) {
      console.error('❌ Error al buscar/crear carpeta de orden:', err)
      throw err
    }
  }

  // Subir orden a Google Drive
  const subirOrdenAGoogleDrive = async (orden, contenidoHTML) => {
    try {
      console.log(`🔄 Subiendo orden ${orden.numeroOrden} a Google Drive`)
      
      if (!estaAutenticado()) {
        throw new Error('No estás autenticado con Google Drive')
      }

      // Buscar o crear carpeta
      let carpeta = await buscarCarpeta('Ordenes de Mantenimiento - AutoService')
      if (!carpeta) {
        console.log('📁 Creando carpeta de órdenes...')
        const carpetaId = await crearCarpeta('Ordenes de Mantenimiento - AutoService')
        carpeta = { id: carpetaId }
      }

      // Subir archivo
      const nombreArchivo = `${orden.numeroOrden} - ${orden.cliente?.nombre || 'Sin Cliente'}.html`
      const archivo = await subirArchivo(nombreArchivo, contenidoHTML, carpeta.id)

      console.log('✅ Orden subida exitosamente')
      success(`Orden ${orden.numeroOrden} guardada en Google Drive`)
      
      return {
        success: true,
        fileId: archivo.id,
        fileName: archivo.name,
        webViewLink: archivo.webViewLink
      }

    } catch (err) {
      console.error('❌ Error al subir orden:', err)
      
      let mensajeError = 'Error desconocido'
      if (err.message.includes('401')) {
        mensajeError = 'Token expirado. Vuelve a autenticarte.'
      } else if (err.message.includes('403')) {
        mensajeError = 'Sin permisos para subir archivos.'
      } else if (err.message.includes('404')) {
        mensajeError = 'Servicio no encontrado.'
      } else {
        mensajeError = err.message
      }
      
      error(`Error al guardar en Google Drive: ${mensajeError}`)
      return { success: false, error: mensajeError }
    }
  }

  // Cerrar sesión
  const cerrarSesion = () => {
    try {
      console.log('🔄 Cerrando sesión...')
      
      if (accessToken.value) {
        window.google.accounts.oauth2.revoke(accessToken.value, () => {
          console.log('✅ Token revocado')
        })
      }
      
      accessToken.value = null
      isAuthenticated.value = false
      
      if (window.gapi?.client) {
        window.gapi.client.setToken(null)
      }
      
      console.log('✅ Sesión cerrada')
      success('Sesión cerrada correctamente')
    } catch (err) {
      console.error('❌ Error al cerrar sesión:', err)
      error('Error al cerrar sesión')
    }
  }

  // Método para obtener información de debug
  const getDebugInfo = () => {
    return {
      isInitialized: isInitialized.value,
      isAuthenticated: isAuthenticated.value,
      hasAccessToken: !!accessToken.value,
      hasTokenClient: !!tokenClient.value,
      clientId: CLIENT_ID,
      initializationError: initializationError.value,
      gapiLoaded: typeof window.gapi !== 'undefined',
      googleLoaded: typeof window.google !== 'undefined'
    }
  }

  return {
    // Estado
    isInitialized,
    isAuthenticated,
    initializationError,
    
    // Métodos
    initializeGoogleDrive,
    authenticateUser,
    subirOrdenAGoogleDrive,
    subirImagen,
    estaAutenticado,
    cerrarSesion,
    diagnosticarProblemas,
    getDebugInfo
  }
}
