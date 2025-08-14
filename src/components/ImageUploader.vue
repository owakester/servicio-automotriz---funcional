<template>
  <div class="space-y-4">
    <!-- Header del componente -->
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-900">Fotos del Servicio</h3>
      <div class="flex items-center space-x-2">
        <div class="text-sm text-gray-600">
          Estado: {{ estaAutenticado() ? '✅ Conectado' : '❌ Desconectado' }}
        </div>
        <button
          @click="abrirSelectorArchivos"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
          :disabled="!numeroOrden || subiendoImagen"
        >
          <Camera class="h-4 w-4 mr-2" />
          {{ subiendoImagen ? 'Subiendo...' : 'Agregar Foto' }}
        </button>
        <button
          @click="debugEstado"
          class="bg-gray-500 hover:bg-gray-600 text-white px-2 py-2 rounded transition-colors text-xs"
          title="Debug"
        >
          🔍
        </button>
        <button
          @click="forzarModal"
          class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-2 rounded transition-colors text-xs"
          title="Test Modal"
        >
          🧪
        </button>
      </div>
    </div>

    <!-- Input oculto para seleccionar archivos -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      @change="handleFileSelect"
      class="hidden"
    />

    <!-- Lista de imágenes existentes -->
    <div v-if="imagenesOrden && imagenesOrden.length > 0" class="space-y-3">
      <h4 class="text-sm font-medium text-gray-700">Imágenes subidas:</h4>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div 
          v-for="imagen in imagenesOrden" 
          :key="imagen.fileId"
          class="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
        >
          <!-- Imagen -->
          <img
            v-if="imagen.thumbnailLink"
            :src="imagen.thumbnailLink"
            :alt="imagen.descripcion || 'Foto del servicio'"
            class="w-full h-full object-cover transition-transform group-hover:scale-105"
            @error="handleImageError"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gray-200">
            <Image class="h-8 w-8 text-gray-400" />
          </div>

          <!-- Overlay con acciones -->
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
              <button
                @click="verImagen(imagen)"
                class="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                title="Ver imagen completa"
              >
                <Eye class="h-4 w-4" />
              </button>
              <button
                @click="eliminarImagen(imagen)"
                class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                title="Eliminar imagen"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Información de la imagen -->
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
            <p class="text-white text-xs truncate">
              {{ imagen.descripcion || imagen.fileName }}
            </p>
            <p class="text-gray-300 text-xs">
              {{ formatearFecha(imagen.uploadedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado cuando no hay imágenes -->
    <div v-else-if="numeroOrden" class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
      <Camera class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No hay fotos del servicio</h3>
      <p class="text-gray-500 mb-4">
        {{ estaAutenticado() ? 'Agrega fotos para documentar el trabajo realizado' : 'Conecta Google Drive para subir fotos' }}
      </p>
      <button
        v-if="estaAutenticado()"
        @click="abrirSelectorArchivos"
        class="btn-primary"
      >
        Subir Primera Foto
      </button>
    </div>

    <!-- Modal para ver imagen completa -->
    <div
      v-if="mostrarModalImagen"
      class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      @click="cerrarModalImagen"
    >
      <div class="relative max-w-4xl max-h-full p-4">
        <img
          :src="imagenSeleccionada?.webViewLink"
          :alt="imagenSeleccionada?.descripcion"
          class="max-w-full max-h-full object-contain"
        />
        <button
          @click="cerrarModalImagen"
          class="absolute top-4 right-4 p-2 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-30 transition-colors"
        >
          <X class="h-6 w-6" />
        </button>
        <div class="absolute bottom-4 left-4 right-4 text-center">
          <p class="text-white text-lg font-medium">
            {{ imagenSeleccionada?.descripcion || imagenSeleccionada?.fileName }}
          </p>
          <p class="text-gray-300">
            {{ formatearFecha(imagenSeleccionada?.uploadedAt) }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal JavaScript puro -->
  <div 
    id="modal-imagen" 
    v-show="mostrarModalDescripcion"
    ref="modalRef"
    style="display: none;"
  >
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Camera, Image, Eye, Trash2, X, Cloud } from 'lucide-vue-next'
import { useGoogleDrive } from '../composables/useGoogleDrive'
import { useNotifications } from '../composables/useNotifications'

// Props
const props = defineProps({
  numeroOrden: {
    type: String,
    required: true
  },
  imagenes: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['imagen-subida', 'imagen-eliminada'])

// Composables
const { subirImagen, estaAutenticado, initializeGoogleDrive, authenticateUser, getDebugInfo, accessToken } = useGoogleDrive()
const { success, error } = useNotifications()

// Estado
const fileInput = ref(null)
const subiendoImagen = ref(false)
const mostrarModalDescripcion = ref(false)
const mostrarModalImagen = ref(false)
const descripcionImagen = ref('')
const archivoSeleccionado = ref(null)
const previsualizacionImagen = ref('')
const imagenSeleccionada = ref(null)

// Computed
const imagenesOrden = computed(() => props.imagenes || [])

// Watchers
watch(() => props.numeroOrden, () => {
  // Limpiar estado cuando cambia la orden
  cerrarModales()
})

// Métodos
const debugEstado = () => {
  console.log('=== DEBUG IMAGEUPLOADER ===')
  console.log('numeroOrden:', props.numeroOrden)
  console.log('estaAutenticado():', estaAutenticado())
  console.log('subiendoImagen:', subiendoImagen.value)
  console.log('imagenes prop:', props.imagenes)
  console.log('imagenesOrden computed:', imagenesOrden.value)
  
  const debugInfo = getDebugInfo()
  console.log('Google Drive Debug Info:', debugInfo)
  
  const mensaje = `Debug ImageUploader:

numeroOrden: ${props.numeroOrden}
estaAutenticado: ${estaAutenticado()}
subiendoImagen: ${subiendoImagen.value}
imagenes: ${props.imagenes?.length || 0}

Google Drive Info:
isInitialized: ${debugInfo.isInitialized}
isAuthenticated: ${debugInfo.isAuthenticated}
hasAccessToken: ${debugInfo.hasAccessToken}
hasTokenClient: ${debugInfo.hasTokenClient}`
  
  alert(mensaje)
}

const forzarModal = () => {
  console.log('🧪 Forzando modal de prueba...')
  
  // Crear el modal directamente en el DOM
  const modalHtml = `
    <div id="modal-test" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    ">
      <div style="
        background-color: white;
        border-radius: 8px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        text-align: center;
      ">
        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px;">
          🎉 ¡MODAL FUNCIONA!
        </h3>
        <div style="margin-bottom: 16px; padding: 16px; background-color: #dbeafe; border-radius: 4px;">
          <p style="color: #1e40af; font-weight: 500;">Si puedes ver esto centrado, el modal funciona correctamente</p>
        </div>
        <button onclick="document.getElementById('modal-test').remove()" style="
          padding: 8px 16px;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">
          Cerrar
        </button>
      </div>
    </div>
  `
  
  // Insertar en el body
  document.body.insertAdjacentHTML('beforeend', modalHtml)
  console.log('👍 Modal insertado directamente en el DOM')
}

// Función para mostrar el modal de subida de imagen
const mostrarModalSubida = (imagenDataUrl) => {
  const modalHtml = `
    <div id="modal-subida" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    ">
      <div style="
        background-color: white;
        border-radius: 8px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      ">
        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px;">
          Descripción de la imagen
        </h3>
        
        <!-- Vista previa de la imagen -->
        <div style="margin-bottom: 16px;">
          <img
            src="${imagenDataUrl}"
            alt="Vista previa"
            style="width: 100%; height: 128px; object-fit: cover; border-radius: 4px; border: 1px solid #d1d5db;"
          />
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px;">
            Descripción (opcional)
          </label>
          <input
            id="descripcion-input"
            type="text"
            style="
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 14px;
              box-sizing: border-box;
            "
            placeholder="Ej: Motor antes del servicio, Filtro reemplazado..."
            maxlength="100"
          />
          <p id="contador-chars" style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            0/100 caracteres
          </p>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button onclick="cancelarSubidaModal()" style="
            padding: 8px 16px;
            color: #374151;
            background-color: #e5e7eb;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">
            Cancelar
          </button>
          <button id="btn-subir" onclick="confirmarSubidaModal()" style="
            padding: 8px 16px;
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">
            Subir Imagen
          </button>
        </div>
      </div>
    </div>
  `
  
  // Insertar en el body
  document.body.insertAdjacentHTML('beforeend', modalHtml)
  
  // Agregar event listener para el contador de caracteres
  const input = document.getElementById('descripcion-input')
  const contador = document.getElementById('contador-chars')
  
  input.addEventListener('input', function() {
    contador.textContent = `${this.value.length}/100 caracteres`
  })
  
  // Enfocar el input
  input.focus()
  
  console.log('🖼️ Modal de subida creado')
}

// Funciones globales para los botones del modal
window.cancelarSubidaModal = () => {
  console.log('❌ Cancelando subida...')
  const modal = document.getElementById('modal-subida')
  if (modal) {
    modal.remove()
  }
  // Limpiar datos
  archivoSeleccionado.value = null
  previsualizacionImagen.value = ''
  console.log('🧹 Subida cancelada')
}

window.confirmarSubidaModal = async () => {
  console.log('⬆️ Confirmando subida...')
  const input = document.getElementById('descripcion-input')
  const btnSubir = document.getElementById('btn-subir')
  
  if (!archivoSeleccionado.value || !props.numeroOrden) {
    console.error('❌ Faltan datos para subir')
    return
  }
  
  // Deshabilitar botón
  btnSubir.disabled = true
  btnSubir.textContent = 'Verificando...'
  btnSubir.style.backgroundColor = '#9ca3af'
  
  // Verificar autenticación EN EL MOMENTO de subir
  console.log('🔍 Verificando autenticación al momento de subir...')
  let autenticado = estaAutenticado()
  console.log('🔍 Estado inicial:', autenticado)
  
  // Si no está autenticado, intentar reparar AHORA
  if (!autenticado) {
    console.log('🔧 Intentando reparar autenticación antes de subir...')
    btnSubir.textContent = 'Conectando...'
    
    try {
      // Intentar inicializar y autenticar
      const initialized = await initializeGoogleDrive()
      if (initialized) {
        await authenticateUser()
        // Dar un momento para que se complete la autenticación
        await new Promise(resolve => setTimeout(resolve, 1000))
        autenticado = estaAutenticado()
        console.log('🔍 Estado después de reparación:', autenticado)
      }
    } catch (err) {
      console.error('❌ Error reparando autenticación:', err)
    }
  }
  
  // Si AUN no está autenticado, pedir al usuario que conecte manualmente
  if (!autenticado) {
    btnSubir.disabled = false
    btnSubir.textContent = 'Subir Imagen'
    btnSubir.style.backgroundColor = '#2563eb'
    
    alert('No estás conectado a Google Drive.\n\nPor favor:\n1. Cierra este modal\n2. Haz clic en "Conectar Google Drive"\n3. Autoriza los permisos\n4. Vuelve a intentar subir la imagen')
    return
  }
  
  // Proceder con la subida
  btnSubir.textContent = 'Subiendo...'
  
  try {
    const descripcion = input.value.trim()
    console.log('📤 Llamando a subirImagen...')
    
    const resultado = await subirImagen(
      archivoSeleccionado.value,
      props.numeroOrden,
      descripcion
    )
    
    console.log('📨 Resultado de subida:', resultado)
    
    if (resultado.success) {
      console.log('✅ Subida exitosa, emitiendo evento...')
      emit('imagen-subida', {
        ...resultado,
        descripcion
      })
      
      // Cerrar modal
      const modal = document.getElementById('modal-subida')
      if (modal) {
        modal.remove()
      }
      
      // Limpiar datos
      archivoSeleccionado.value = null
      previsualizacionImagen.value = ''
      
      console.log('🎉 Imagen subida exitosamente')
    } else {
      console.error('❌ Subida falló:', resultado.error)
      
      // Manejar errores específicos
      if (resultado.error.includes('autenticado')) {
        alert('Error de autenticación: Vuelve a conectar Google Drive')
      } else {
        alert('Error al subir la imagen: ' + resultado.error)
      }
    }
  } catch (err) {
    console.error('❌ Error al subir imagen:', err)
    
    // Manejar errores de token
    if (err.message.includes('401') || err.message.includes('autenticado')) {
      alert('Error de autenticación: Tu sesión ha expirado. Vuelve a conectar Google Drive.')
    } else {
      alert('Error al subir la imagen: ' + err.message)
    }
  } finally {
    // Rehabilitar botón
    btnSubir.disabled = false
    btnSubir.textContent = 'Subir Imagen'
    btnSubir.style.backgroundColor = '#2563eb'
  }
}

const abrirSelectorArchivos = async () => {
  console.log('📁 Abriendo selector de archivos...')
  console.log('numeroOrden:', props.numeroOrden)
  console.log('estaAutenticado():', estaAutenticado())
  
  if (!props.numeroOrden) {
    error('Debes seleccionar una orden primero')
    return
  }
  
  // SIEMPRE abrir el selector primero
  console.log('📜 Abriendo selector de archivos (sin restricción de autenticación)...')
  fileInput.value?.click()
  
  // Verificar autenticación en segundo plano para mostrar advertencias
  if (!estaAutenticado()) {
    console.log('⚠️ Estado de autenticación inválido, pero permitiendo selección...')
    
    // Intentar reparar en segundo plano
    try {
      const initialized = await initializeGoogleDrive()
      if (initialized && estaAutenticado()) {
        console.log('✅ Autenticación reparada automáticamente')
        success('Conexión a Google Drive reparada')
      }
    } catch (err) {
      console.warn('⚠️ No se pudo reparar autenticación automáticamente:', err)
      // No mostrar error aquí, se manejará al intentar subir
    }
  }
}

const handleFileSelect = (event) => {
  console.log('📁 Archivo seleccionado')
  const archivos = Array.from(event.target.files)
  console.log('Archivos:', archivos)
  
  if (archivos.length === 0) {
    console.log('⚠️ No se seleccionaron archivos')
    return
  }
  
  // Verificación OPTIMIZADA de autenticación
  console.log('🔍 Verificando autenticación con archivo seleccionado...')
  
  // Con la nueva versión optimizada, una sola llamada debería ser suficiente
  const estadoAuth = estaAutenticado()
  console.log(`🔍 Estado de autenticación: ${estadoAuth}`)
  
  if (!estadoAuth) {
    console.error('❌ Autenticación falló después de optimización')
    error('Google Drive no está disponible. Haz clic en "Conectar Google Drive" primero.')
    event.target.value = ''
    return
  }
  
  console.log('✅ Autenticación verificada, continuando...')

  // Por ahora manejar solo el primer archivo
  const archivo = archivos[0]
  console.log('Procesando archivo:', {
    name: archivo.name,
    size: archivo.size,
    type: archivo.type
  })
  
  // Validaciones
  if (!archivo.type.startsWith('image/')) {
    console.error('❌ No es una imagen:', archivo.type)
    error('Solo se permiten archivos de imagen')
    return
  }

  if (archivo.size > 5 * 1024 * 1024) {
    console.error('❌ Archivo muy grande:', archivo.size)
    error('La imagen no puede ser mayor a 5MB')
    return
  }

  console.log('✅ Archivo válido, creando vista previa...')
  
  // Crear vista previa
  const reader = new FileReader()
  reader.onload = (e) => {
    console.log('🖼️ Vista previa creada')
    previsualizacionImagen.value = e.target.result
    archivoSeleccionado.value = archivo
    
    // Mostrar modal usando JavaScript puro
    console.log('🔄 Creando modal de subida...')
    mostrarModalSubida(e.target.result)
  }
  
  reader.onerror = () => {
    console.error('❌ Error al leer archivo')
    error('Error al leer el archivo')
  }
  
  reader.readAsDataURL(archivo)

  // Limpiar el input
  event.target.value = ''
  console.log('🧹 Input limpiado')
}

const confirmarSubida = async () => {
  console.log('⬆️ Iniciando subida de imagen...')
  console.log('Archivo:', archivoSeleccionado.value?.name)
  console.log('Número de orden:', props.numeroOrden)
  console.log('Descripción:', descripcionImagen.value)
  
  if (!archivoSeleccionado.value || !props.numeroOrden) {
    console.error('❌ Faltan datos para subir')
    return
  }

  subiendoImagen.value = true
  console.log('🔄 Estado de subida activado')

  try {
    console.log('📤 Llamando a subirImagen...')
    const resultado = await subirImagen(
      archivoSeleccionado.value,
      props.numeroOrden,
      descripcionImagen.value.trim()
    )
    
    console.log('📨 Resultado de subida:', resultado)

    if (resultado.success) {
      console.log('✅ Subida exitosa, emitiendo evento...')
      emit('imagen-subida', {
        ...resultado,
        descripcion: descripcionImagen.value.trim()
      })
      cancelarSubida()
    } else {
      console.error('❌ Subida falló:', resultado.error)
    }
  } catch (err) {
    console.error('❌ Error al subir imagen:', err)
    error('Error al subir la imagen')
  } finally {
    subiendoImagen.value = false
    console.log('🏁 Proceso de subida terminado')
  }
}

const cancelarSubida = () => {
  mostrarModalDescripcion.value = false
  descripcionImagen.value = ''
  archivoSeleccionado.value = null
  previsualizacionImagen.value = ''
  subiendoImagen.value = false
}

const verImagen = (imagen) => {
  imagenSeleccionada.value = imagen
  mostrarModalImagen.value = true
}

const cerrarModalImagen = () => {
  mostrarModalImagen.value = false
  imagenSeleccionada.value = null
}

const eliminarImagen = (imagen) => {
  if (confirm(`¿Estás seguro de que deseas eliminar esta imagen?`)) {
    emit('imagen-eliminada', imagen)
    success('Imagen eliminada (nota: el archivo permanece en Google Drive)')
  }
}

const cerrarModales = () => {
  cancelarSubida()
  cerrarModalImagen()
}

const reconectarGoogleDrive = async () => {
  try {
    console.log('🔄 Reconectando Google Drive desde ImageUploader...')
    
    const initialized = await initializeGoogleDrive()
    if (initialized) {
      await authenticateUser()
      success('Google Drive conectado correctamente')
    } else {
      error('No se pudo inicializar Google Drive')
    }
  } catch (err) {
    console.error('❌ Error al reconectar Google Drive:', err)
    error('Error al conectar con Google Drive')
  }
}

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleImageError = (event) => {
  // Si falla la carga de la imagen, mostrar placeholder
  event.target.style.display = 'none'
  event.target.parentElement.classList.add('bg-gray-200')
}
</script>