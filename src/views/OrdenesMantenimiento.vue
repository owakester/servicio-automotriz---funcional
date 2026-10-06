<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900">Órdenes de Mantenimiento</h1>
      <div>
        <button
          v-if="vehiculos.length > 0"
          @click="mostrarFormulario = true"
          class="btn-primary flex items-center"
        >
          <Plus class="h-4 w-4 mr-2" aria-hidden="true" />
          Nueva Orden
        </button>
        <router-link v-else to="/vehiculos" class="btn-primary inline-flex items-center">
          <Car class="h-4 w-4 mr-2" aria-hidden="true" />
          Agregar vehículo primero
        </router-link>
      </div>
    </div>

    <!-- Estadísticas -->
    <div v-if="ordenesCompletas.length > 0" class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <div class="card text-center">
        <div class="text-2xl font-bold text-blue-600">{{ estadisticasOrdenes.total }}</div>
        <div class="text-sm text-gray-600">Total</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-yellow-600">{{ estadisticasOrdenes.pendientes }}</div>
        <div class="text-sm text-gray-600">Pendientes</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-blue-600">{{ estadisticasOrdenes.enProceso }}</div>
        <div class="text-sm text-gray-600">En Proceso</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-green-600">{{ estadisticasOrdenes.completadas }}</div>
        <div class="text-sm text-gray-600">Completadas</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-red-600">{{ estadisticasOrdenes.canceladas }}</div>
        <div class="text-sm text-gray-600">Canceladas</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-red-600">{{ estadisticasOrdenes.vencidas }}</div>
        <div class="text-sm text-gray-600">Vencidas</div>
      </div>
      <div class="card text-center">
        <div class="text-2xl font-bold text-orange-600">{{ estadisticasOrdenes.proximasVencer }}</div>
        <div class="text-sm text-gray-600">Por Vencer</div>
      </div>
    </div>

    <!-- Filtros -->
    <div v-if="ordenesCompletas.length > 0" class="card">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <input
            v-model="filtroTexto"
            type="text"
            placeholder="Buscar por número de orden..."
            class="input-field"
          />
        </div>
        <div>
          <select v-model="filtroEstado" class="input-field">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <select v-model="filtroPrioridad" class="input-field">
            <option value="">Todas las prioridades</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <select v-model="filtroVehiculo" class="input-field">
            <option value="">Todos los vehículos</option>
            <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
              {{ vehiculo.marca }} {{ vehiculo.modelo }} - {{ vehiculo.patente }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista de Órdenes -->
    <div class="card">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-gray-50">
            <tr>
              <th>Número de Orden</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Fecha Creación</th>
              <th>Fecha Vencimiento</th>
              <th>Presupuesto Estimado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="orden in ordenesFiltradas" :key="orden.id">
              <td class="font-medium text-primary-600">{{ orden.numeroOrden }}</td>
              <td>{{ orden.cliente?.nombre || 'Sin cliente' }}</td>
              <td>
                <div class="text-sm">
                  <div class="font-medium">{{ orden.vehiculo?.marca }} {{ orden.vehiculo?.modelo }}</div>
                  <div class="text-gray-500">{{ orden.vehiculo?.patente }}</div>
                </div>
              </td>
              <td>
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    orden.estado === 'completada' ? 'bg-green-100 text-green-800' :
                    orden.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                    orden.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  ]"
                >
                  {{ formatearEstado(orden.estado) }}
                </span>
              </td>
              <td>
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    orden.prioridad === 'urgente' ? 'bg-red-100 text-red-800' :
                    orden.prioridad === 'alta' ? 'bg-orange-100 text-orange-800' :
                    orden.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ formatearPrioridad(orden.prioridad) }}
                </span>
              </td>
              <td>{{ new Date(orden.fechaCreacion).toLocaleDateString('es-ES') }}</td>
              <td>
                <span 
                  :class="[
                    'text-sm',
                    orden.fechaVencimiento && new Date(orden.fechaVencimiento) < new Date() && orden.estado !== 'completada' ? 'text-red-600 font-semibold' : 'text-gray-900'
                  ]"
                >
                  {{ orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString('es-ES') : 'Sin fecha' }}
                </span>
              </td>
              <td>${{ orden.costoEstimado?.toLocaleString() || 'Sin presupuesto' }}</td>
              <td>
                <div class="flex space-x-2">
                  <!-- Botón WhatsApp para notificar que está listo -->
                  <button
                    v-if="orden.estado === 'completada'"
                    @click="notificarClienteWhatsApp(orden)"
                    class="p-2 text-green-600 hover:text-green-800 transition-colors"
                  title="Notificar por WhatsApp que está listo"
                  :aria-label="`Notificar por WhatsApp que la orden ${orden.numeroOrden} está lista`"
                  >
                    <MessageCircle class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <!-- Botón para compartir fotos -->
                  <button
                    v-if="orden.estado === 'completada'"
                    @click="compartirFotosWhatsApp(orden)"
                    class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                  title="Compartir fotos del trabajo"
                  :aria-label="`Compartir fotos de la orden ${orden.numeroOrden}`"
                  >
                    <Share2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    @click="generarYSubirPDF(orden)"
                    class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                  title="Generar PDF y subir a Google Drive"
                  :aria-label="`Generar PDF de la orden ${orden.numeroOrden}`"
                  >
                    <FileText class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    @click="editarOrden(orden)"
                    class="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Editar orden"
                  :aria-label="`Editar orden ${orden.numeroOrden}`"
                  >
                    <Edit2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    @click="eliminarOrdenConfirm(orden.id)"
                    class="p-2 text-red-600 hover:text-red-800 transition-colors"
                  title="Eliminar orden"
                  :aria-label="`Eliminar orden ${orden.numeroOrden}`"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Estado vacío -->
        <div v-if="ordenesFiltradas.length === 0" class="text-center py-12">
          <FileText class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ hayFiltros ? 'No se encontraron órdenes' : vehiculos.length === 0 ? 'Primero registrá un vehículo' : 'No hay órdenes de mantenimiento' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ hayFiltros ? 'Intenta con otros filtros' : vehiculos.length === 0 ? 'La orden necesita un vehículo y un cliente asociados.' : 'Creá una orden para organizar el trabajo pendiente.' }}
          </p>
          <button
            v-if="!hayFiltros"
            @click="vehiculos.length === 0 ? router.push('/vehiculos') : (mostrarFormulario = true)"
            class="btn-primary"
          >
            {{ vehiculos.length === 0 ? 'Ir a Vehículos' : 'Crear Primera Orden' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Formulario -->
    <div
      v-if="mostrarFormulario"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="cancelarFormulario"
      @keydown.esc="cancelarFormulario"
    >
      <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="order-form-title" tabindex="-1">
        <h2 id="order-form-title" class="text-xl font-bold text-gray-900 mb-4">
          {{ ordenEditando ? 'Editar Orden' : 'Nueva Orden de Mantenimiento' }}
        </h2>

        <form @submit.prevent="guardarOrden" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="order-vehicle" class="block text-sm font-medium text-gray-700 mb-1">
                Vehículo *
              </label>
              <select
                v-model="formulario.vehiculoId"
                id="order-vehicle"
                autofocus
                @change="onVehiculoChange"
                required
                class="input-field"
              >
                <option value="">Seleccionar vehículo</option>
                <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
                  {{ vehiculo.marca }} {{ vehiculo.modelo }} - {{ vehiculo.patente }}
                </option>
              </select>
            </div>

            <div>
              <label for="order-client" class="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                :value="clienteSeleccionado?.nombre || ''"
                id="order-client"
                type="text"
                readonly
                class="input-field bg-gray-50"
                placeholder="Se selecciona automáticamente"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="order-status" class="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                v-model="formulario.estado"
                id="order-status"
                required
                class="input-field"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label for="order-priority" class="block text-sm font-medium text-gray-700 mb-1">
                Prioridad *
              </label>
              <select
                v-model="formulario.prioridad"
                id="order-priority"
                required
                class="input-field"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label for="order-due-date" class="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento
              </label>
              <input
                v-model="formulario.fechaVencimiento"
                id="order-due-date"
                type="date"
                class="input-field"
              />
            </div>
          </div>

          <div>
            <label for="order-estimate" class="block text-sm font-medium text-gray-700 mb-1">
              Presupuesto Estimado ($)
            </label>
            <input
              v-model="formulario.costoEstimado"
              id="order-estimate"
              type="number"
              min="0"
              step="0.01"
              class="input-field"
              placeholder="Estimado para el cliente"
            />
          </div>

          <div>
            <label for="order-description" class="block text-sm font-medium text-gray-700 mb-1">
              Descripción del Trabajo *
            </label>
            <textarea
              v-model="formulario.descripcionTrabajo"
              id="order-description"
              class="input-field"
              rows="4"
              required
              placeholder="Describe detalladamente el trabajo a realizar..."
            ></textarea>
          </div>

          <div>
            <label for="order-observations" class="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              v-model="formulario.observaciones"
              id="order-observations"
              class="input-field"
              rows="3"
              placeholder="Observaciones adicionales..."
            ></textarea>
          </div>

          <!-- Sección de imágenes solo para órdenes existentes -->
          <div v-if="ordenEditando" class="border-t pt-6 mt-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div class="flex items-center mb-2">
                <Camera class="h-5 w-5 text-blue-600 mr-2" />
                <h3 class="text-lg font-semibold text-blue-900">Fotos del Servicio</h3>
              </div>
              <p class="text-sm text-blue-700">
                Documenta el trabajo realizado subiendo fotos a Google Drive
              </p>
            </div>
            <ImageUploader
              :numero-orden="ordenEditando.numeroOrden"
              :imagenes="obtenerImagenesDeOrden(ordenEditando.id)"
              @imagen-subida="handleImagenSubida"
              @imagen-eliminada="handleImagenEliminada"
            />
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="cancelarFormulario"
              class="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="btn-primary"
            >
              {{ ordenEditando ? 'Actualizar' : 'Crear Orden' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Dialog de Confirmación -->
    <ConfirmDialog
      :show="mostrarConfirmacion"
      :title="confirmacion.titulo"
      :message="confirmacion.mensaje"
      :confirm-text="confirmacion.textoConfirmar"
      :type="confirmacion.tipo"
      @confirm="confirmarAccion"
      @cancel="cancelarAccion"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Plus, 
  Car,
  FileText, 
  Edit2, 
  Trash2, 
  Cloud,
  AlertCircle,
  Camera,
  MessageCircle,
  Share2
} from 'lucide-vue-next'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import ImageUploader from '../components/ImageUploader.vue'
import { useOrdenes } from '../composables/useOrdenes'
import { useAutoService } from '../composables/useAutoService'
import { usePDF } from '../composables/usePDF'
import { useGoogleDrive } from '../composables/useGoogleDrive'
import { useNotifications } from '../composables/useNotifications'

const {
  ordenesCompletas,
  crearOrden,
  actualizarOrden,
  eliminarOrden,
  estadisticasOrdenes,
  agregarImagenAOrden,
  eliminarImagenDeOrden,
  obtenerImagenesDeOrden
} = useOrdenes()

const { 
  vehiculos, 
  obtenerVehiculoPorId, 
  obtenerClientePorId,
  notificarAutoListo,
  compartirFotos,
  abrirWhatsApp
} = useAutoService()
const { generarPDFOrden } = usePDF()
const { initializeGoogleDrive, authenticateUser, subirOrdenAGoogleDrive, estaAutenticado, getDebugInfo, diagnosticarProblemas } = useGoogleDrive()
const { success, error } = useNotifications()
const router = useRouter()

// Estado del componente
const mostrarFormulario = ref(false)
const ordenEditando = ref(null)
const filtroTexto = ref('')
const filtroEstado = ref('')
const filtroPrioridad = ref('')
const filtroVehiculo = ref('')
const mostrarConfirmacion = ref(false)
const googleDriveEnabled = ref(true)
const isConnecting = ref(false)
const confirmacion = ref({
  titulo: '',
  mensaje: '',
  textoConfirmar: '',
  tipo: 'primary',
  accion: null
})

// Formulario
const formulario = ref({
  vehiculoId: '',
  clienteId: '',
  estado: 'pendiente',
  prioridad: 'media',
  fechaVencimiento: '',
  costoEstimado: '',
  descripcionTrabajo: '',
  observaciones: ''
})

// Computed
const ordenesFiltradas = computed(() => {
  let resultado = ordenesCompletas.value

  // Filtro por texto
  if (filtroTexto.value) {
    const filtro = filtroTexto.value.toLowerCase()
    resultado = resultado.filter(orden => 
      orden.numeroOrden.toLowerCase().includes(filtro) ||
      orden.descripcionTrabajo?.toLowerCase().includes(filtro)
    )
  }

  // Filtro por estado
  if (filtroEstado.value) {
    resultado = resultado.filter(orden => orden.estado === filtroEstado.value)
  }

  // Filtro por prioridad
  if (filtroPrioridad.value) {
    resultado = resultado.filter(orden => orden.prioridad === filtroPrioridad.value)
  }

  // Filtro por vehículo
  if (filtroVehiculo.value) {
    resultado = resultado.filter(orden => 
      orden.vehiculoId === parseInt(filtroVehiculo.value)
    )
  }

  return resultado.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
})

const hayFiltros = computed(() => 
  filtroTexto.value || filtroEstado.value || filtroPrioridad.value || filtroVehiculo.value
)

const clienteSeleccionado = computed(() => {
  if (formulario.value.vehiculoId) {
    const vehiculo = obtenerVehiculoPorId(parseInt(formulario.value.vehiculoId))
    return vehiculo ? obtenerClientePorId(vehiculo.clienteId) : null
  }
  return null
})

// Funciones
const formatearEstado = (estado) => {
  const estados = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    completada: 'Completada',
    cancelada: 'Cancelada'
  }
  return estados[estado] || estado
}

const formatearPrioridad = (prioridad) => {
  const prioridades = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente'
  }
  return prioridades[prioridad] || prioridad
}

const limpiarFormulario = () => {
  formulario.value = {
    vehiculoId: '',
    clienteId: '',
    estado: 'pendiente',
    prioridad: 'media',
    fechaVencimiento: '',
    costoEstimado: '',
    descripcionTrabajo: '',
    observaciones: ''
  }
}

const onVehiculoChange = () => {
  if (formulario.value.vehiculoId) {
    const vehiculo = obtenerVehiculoPorId(parseInt(formulario.value.vehiculoId))
    if (vehiculo) {
      formulario.value.clienteId = vehiculo.clienteId
    }
  }
}

const editarOrden = (orden) => {
  ordenEditando.value = orden
  formulario.value = {
    ...orden,
    vehiculoId: orden.vehiculoId.toString(),
    clienteId: orden.clienteId.toString(),
    fechaVencimiento: orden.fechaVencimiento ? orden.fechaVencimiento.split('T')[0] : '',
    costoEstimado: orden.costoEstimado || ''
  }
  mostrarFormulario.value = true
}

const guardarOrden = () => {
  const datosOrden = {
    ...formulario.value,
    vehiculoId: parseInt(formulario.value.vehiculoId),
    clienteId: parseInt(formulario.value.clienteId),
    costoEstimado: formulario.value.costoEstimado ? parseFloat(formulario.value.costoEstimado) : 0,
    fechaVencimiento: formulario.value.fechaVencimiento || null
  }

  const resultado = ordenEditando.value
    ? actualizarOrden(ordenEditando.value.id, datosOrden)
    : crearOrden(datosOrden)
  if (resultado) cancelarFormulario()
}

const cancelarFormulario = () => {
  mostrarFormulario.value = false
  ordenEditando.value = null
  limpiarFormulario()
}

const eliminarOrdenConfirm = (ordenId) => {
  const orden = ordenesCompletas.value.find(o => o.id === ordenId)
  confirmacion.value = {
    titulo: 'Eliminar Orden',
    mensaje: `¿Estás seguro de que deseas eliminar la orden ${orden?.numeroOrden}?`,
    textoConfirmar: 'Eliminar',
    tipo: 'danger',
    accion: () => eliminarOrden(ordenId)
  }
  mostrarConfirmacion.value = true
}

const confirmarAccion = () => {
  if (confirmacion.value.accion) {
    confirmacion.value.accion()
  }
  cancelarAccion()
}

const cancelarAccion = () => {
  mostrarConfirmacion.value = false
  confirmacion.value = {
    titulo: '',
    mensaje: '',
    textoConfirmar: '',
    tipo: 'primary',
    accion: null
  }
}

const conectarGoogleDrive = async () => {
  if (!googleDriveEnabled.value) {
    error('Google Drive está deshabilitado')
    return
  }
  
  if (isConnecting.value) {
    return
  }
  
  isConnecting.value = true
  
  try {
    console.log('🔄 Iniciando conexión a Google Drive...')
    console.log('Debug info:', getDebugInfo())
    
    if (!estaAutenticado()) {
      console.log('🔄 Usuario no autenticado, iniciando proceso...')
      
      // Ejecutar diagnóstico primero
      const diagnosticResult = diagnosticarProblemas()
      if (!diagnosticResult) {
        throw new Error('Falló el diagnóstico inicial')
      }
      
      const initialized = await initializeGoogleDrive()
      if (!initialized) {
        throw new Error('No se pudo inicializar Google Drive')
      }
      
      await authenticateUser()
    } else {
      console.log('✅ Usuario ya autenticado')
      success('Ya estás conectado a Google Drive')
    }
  } catch (err) {
    console.error('❌ Error al conectar Google Drive:', err)
    
    // Mostrar mensaje de error más específico
    let mensaje = 'Error al conectar con Google Drive'
    if (err.message.includes('CLIENT_ID')) {
      mensaje = 'Error de configuración: CLIENT_ID no válido'
    } else if (err.message.includes('Timeout')) {
      mensaje = 'Error de conexión: Timeout al cargar las librerías'
    } else if (err.message.includes('dominio')) {
      mensaje = 'Error: Dominio no autorizado en Google Cloud Console'
    } else {
      mensaje = `Error: ${err.message}`
    }
    
    error(mensaje)
  } finally {
    isConnecting.value = false
  }
}

const generarYSubirPDF = async (orden) => {
  try {
    // Generar PDF
    const contenidoHTML = generarPDFOrden(orden)
    
    if (contenidoHTML) {
      if (googleDriveEnabled.value && estaAutenticado()) {
        // Subir a Google Drive
        const resultado = await subirOrdenAGoogleDrive(orden, contenidoHTML)
        
        if (resultado.success) {
          // Actualizar orden con enlace de Google Drive
          actualizarOrden(orden.id, {
            googleDriveFileId: resultado.fileId,
            googleDriveLink: resultado.webViewLink
          })
        }
      } else {
        success(`PDF de orden ${orden.numeroOrden} generado correctamente`)
      }
    }
  } catch (error) {
    console.error('Error al generar PDF:', error)
    error('Error al generar el PDF')
  }
}

// Funciones para manejo de imágenes
const handleImagenSubida = (imagen) => {
  if (ordenEditando.value) {
    agregarImagenAOrden(ordenEditando.value.id, imagen)
  }
}

const handleImagenEliminada = (imagen) => {
  if (ordenEditando.value) {
    eliminarImagenDeOrden(ordenEditando.value.id, imagen.fileId)
  }
}

// Función para mostrar información de debug
const mostrarDebugInfo = () => {
  const debugInfo = getDebugInfo()
  console.log('=== DEBUG INFO GOOGLE DRIVE ===')
  console.table(debugInfo)
  
  const mensaje = Object.entries(debugInfo)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  
  alert(`Debug Info Google Drive:\n\n${mensaje}`)
}

// FUNCIONES DE WHATSAPP 📱

// Función para notificar al cliente que su auto está listo
const notificarClienteWhatsApp = (orden) => {
  const enlace = notificarAutoListo(orden)
  if (enlace) {
    abrirWhatsApp(enlace)
  }
}

// Función para compartir fotos del trabajo
const compartirFotosWhatsApp = (orden) => {
  const enlace = compartirFotos(orden)
  if (enlace) {
    abrirWhatsApp(enlace)
  }
}

// Cargar Google Drive API al montar el componente
onMounted(async () => {
  // Intentar inicializar Google Drive API automáticamente
  try {
    console.log('🔄 Inicializando Google Drive API automáticamente...')
    
    // Esperar a que las librerías se carguen
    let attempts = 0
    const maxAttempts = 50 // 5 segundos máximo
    
    const waitForLibraries = () => {
      return new Promise((resolve) => {
        const checkLibraries = () => {
          attempts++
          
          if (window.checkGoogleLibraries && window.checkGoogleLibraries()) {
            console.log('✅ Librerías de Google detectadas, inicializando...')
            resolve()
          } else if (attempts >= maxAttempts) {
            console.log('⚠️ Timeout esperando librerías de Google, continuando sin inicialización automática')
            resolve()
          } else {
            setTimeout(checkLibraries, 100)
          }
        }
        checkLibraries()
      })
    }
    
    await waitForLibraries()
    
    // Solo inicializar si las librerías están disponibles
    if (window.checkGoogleLibraries && window.checkGoogleLibraries()) {
      await initializeGoogleDrive()
    } else {
      console.log('⚠️ Librerías de Google no están completamente cargadas, inicialización manual requerida')
    }
    
  } catch (err) {
    console.log('⚠️ Google Drive API no se pudo inicializar automáticamente:', err)
    console.log('💡 Podrás conectarte manualmente usando el botón "Conectar Google Drive"')
  }
})
</script>
