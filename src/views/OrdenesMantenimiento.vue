<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900">Órdenes de Mantenimiento</h1>
      <div>
        <button
          v-if="vehiculos.length > 0"
          @click="abrirNuevaOrden"
          class="btn-primary flex items-center"
        >
          <Plus class="h-4 w-4 mr-2" aria-hidden="true" />
          {{ borradorActivo ? 'Continuar orden' : 'Nueva Orden' }}
        </button>
        <router-link v-else to="/vehiculos" class="btn-primary inline-flex items-center">
          <Car class="h-4 w-4 mr-2" aria-hidden="true" />
          Agregar vehículo primero
        </router-link>
      </div>
    </div>

    <div v-if="borradorActivo && !mostrarFormulario" class="rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-wrap items-center justify-between gap-3" role="status">
      <div>
        <p class="font-medium text-blue-900">Tenés un borrador de orden sin guardar.</p>
        <p class="text-sm text-blue-800">{{ sesionDisponible ? 'Se conserva en esta pestaña al cambiar de sección o recargar. No es una orden guardada ni un backup.' : 'Solo se conserva al navegar en esta pestaña. El navegador no permite recuperar el borrador después de recargar; guardá la orden antes de cerrar.' }}</p>
      </div>
      <div class="flex gap-2"><button type="button" class="btn-primary" @click="reanudarBorrador">Continuar borrador</button><button type="button" class="btn-secondary" @click="descartarFormulario">Descartar</button></div>
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
            placeholder="Buscar por orden, trabajo, cliente o DNI/CUIL..."
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
              <td><ClienteIdentificacion :cliente="orden.cliente" /></td>
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
              <td>{{ formatearFecha(orden.fechaCreacion) }}</td>
              <td>
                <span 
                  :class="[
                    'text-sm',
                    estaFechaVencida(orden.fechaVencimiento, fechaActual) && !['completada', 'cancelada'].includes(orden.estado) ? 'text-red-600 font-semibold' : 'text-gray-900'
                  ]"
                >
                  {{ orden.fechaVencimiento ? formatearFecha(orden.fechaVencimiento) : 'Sin fecha' }}
                </span>
              </td>
              <td>${{ orden.costoEstimado?.toLocaleString() || 'Sin presupuesto' }}</td>
              <td>
                <div class="flex space-x-2">
                  <!-- Vista previa del trabajo, disponible para cualquier estado -->
                  <button
                    @click="ordenACompartir = orden"
                    class="p-2 text-green-700 hover:text-green-900 transition-colors inline-flex items-center gap-1"
                    title="Compartir orden por WhatsApp"
                    :aria-label="`Compartir orden ${orden.numeroOrden} por WhatsApp`"
                  >
                    <MessageCircle class="h-4 w-4" aria-hidden="true" />
                    <span class="text-xs">WhatsApp</span>
                  </button>
                  <!-- Botón para compartir fotos -->
                  <button
                    v-if="orden.estado === 'completada'"
                    @click="compartirFotosWhatsApp(orden)"
                    class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                  :title="obtenerImagenesDeOrden(orden.id).length ? 'Compartir fotos del trabajo (adjuntarlas manualmente en WhatsApp)' : 'Esta orden no tiene fotos; agregalas desde Editar orden'"
                  :aria-label="`Compartir fotos de la orden ${orden.numeroOrden}`"
                  >
                    <Share2 class="h-4 w-4" aria-hidden="true" />
                    <span v-if="!obtenerImagenesDeOrden(orden.id).length" class="text-xs">Sin fotos</span>
                  </button>
                  <button
                    @click="generarYSubirPDF(orden)"
                    class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                  title="Imprimir o guardar PDF (en Drive se guarda una copia HTML)"
                  :aria-label="`Imprimir o guardar como PDF la orden ${orden.numeroOrden}`"
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
            @click="vehiculos.length === 0 ? router.push('/vehiculos') : abrirNuevaOrden()"
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
      @pointerdown.capture="fondoFormulario.iniciar"
      @pointerup.capture="fondoFormulario.terminar"
      @pointercancel.capture="fondoFormulario.cancelar"
      @click.self="fondoFormulario.click"
      @keydown.esc="cancelarFormulario"
    >
      <div v-focus-trap class="order-dialog bg-white rounded-lg p-4 sm:p-6 min-w-0 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="order-form-title" tabindex="-1">
        <h2 id="order-form-title" class="text-xl font-bold text-gray-900 mb-4">
          {{ ordenBorradorId != null ? 'Editar Orden' : 'Nueva Orden de Mantenimiento' }}
        </h2>
        <p class="text-sm text-gray-600 mb-4">Podés elegir <strong>Continuar después</strong> para consultar Servicios y volver sin perder lo escrito. Para registrar la orden, presioná {{ ordenBorradorId != null ? 'Actualizar' : 'Crear Orden' }}.</p>
        <p v-if="ordenBorradorId != null && !ordenEditando" class="text-sm font-medium text-red-700 mb-4" role="alert">La orden de este borrador ya no existe. Conservá el texto que necesites antes de descartar el borrador; no se creará otra orden automáticamente.</p>
        <p v-if="!sesionDisponible" class="text-sm text-amber-900 mb-4" role="status">Este navegador no permite guardar el borrador de sesión. Se conserva al cambiar de sección, pero no después de recargar o cerrar.</p>

        <form @submit.prevent="guardarOrden" class="space-y-4">
          <fieldset :disabled="guardando" class="min-w-0 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="order-client-search" class="block text-sm font-medium text-gray-700 mb-1">Buscar cliente</label>
              <input id="order-client-search" v-model="busquedaCliente" type="search" class="input-field mb-2" placeholder="Nombre o DNI/CUIL" />
              <label for="order-client" class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select id="order-client" v-model="formulario.clienteId" @change="onClienteChange" class="input-field">
                <option value="">Todos los clientes / elegir por vehículo</option>
                <option v-for="cliente in clientesDisponibles" :key="cliente.id" :value="cliente.id">{{ etiquetaCliente(cliente) }}</option>
              </select>
              <p v-if="busquedaCliente.trim() && clientesDisponibles.length === 0" class="mt-1 text-sm text-gray-500">No se encontraron clientes.</p>
            </div>
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
                <option v-for="vehiculo in vehiculosDisponibles" :key="vehiculo.id" :value="vehiculo.id">
                  {{ vehiculo.marca }} {{ vehiculo.modelo }} - {{ vehiculo.patente }}
                </option>
              </select>
              <p class="mt-1 text-sm text-gray-500">{{ formulario.clienteId && vehiculosDisponibles.length === 0 ? 'Este cliente no tiene vehículos. Registrá uno en Vehículos para crear la orden.' : 'Podés elegir primero el cliente o directamente el vehículo.' }}</p>
            </div>
          </div>

          <div v-if="serviciosDelVehiculo.length" class="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
            <label for="order-source-service" class="block text-sm font-medium text-blue-900">Traer información de un servicio de este vehículo</label>
            <select id="order-source-service" v-model="servicioOrigenId" class="input-field">
              <option value="">Seleccionar servicio</option>
              <option v-for="servicio in serviciosDelVehiculo" :key="servicio.id" :value="servicio.id">{{ formatearFecha(servicio.fechaServicio) }} — {{ servicio.tipoServicio }}</option>
            </select>
            <button type="button" class="btn-secondary text-sm" :disabled="!servicioOrigenId || guardando" @click="traerServicio">Agregar descripción y observaciones</button>
            <p class="text-xs text-blue-800">Se agregan al texto existente, sin reemplazarlo. No cambia el presupuesto, estado ni fechas de la orden.</p>
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

          <div class="flex flex-wrap justify-end gap-3 pt-4">
            <button type="button" @click="descartarFormulario" :disabled="guardando" class="text-red-700 underline text-sm">Descartar borrador</button>
            <button
              type="button"
              @click="cancelarFormulario"
              :disabled="guardando"
              class="btn-secondary"
            >
              Continuar después
            </button>
            <button
              type="submit"
              :disabled="guardando"
              class="btn-primary"
            >
              {{ guardando ? 'Guardando…' : ordenBorradorId != null ? 'Actualizar' : 'Crear Orden' }}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>

    <CompartirOrdenWhatsApp v-if="ordenACompartir" :key="ordenACompartir.id" :orden="ordenACompartir" @cerrar="ordenACompartir = null" />

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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { crearCierreFondo } from '../utils/backdropDismiss'
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
import CompartirOrdenWhatsApp from '../components/CompartirOrdenWhatsApp.vue'
import { useBorradorOrden, firmaOrdenEditable } from '../composables/useBorradorOrden'
import { useDiskStorage } from '../composables/useDiskStorage'
import { useOrdenes } from '../composables/useOrdenes'
import { useAutoService } from '../composables/useAutoService'
import { usePDF } from '../composables/usePDF'
import { useGoogleDrive } from '../composables/useGoogleDrive'
import { useNotifications } from '../composables/useNotifications'
import { estaFechaVencida, formatearFecha } from '../utils/dates'
import { useFechaActual } from '../composables/useFechaActual'
import ClienteIdentificacion from '../components/ClienteIdentificacion.vue'
import { etiquetaCliente, coincideDniCuil } from '../utils/clientIdentity'

const { fechaActual } = useFechaActual()

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
  clientes,
  servicios,
  vehiculos, 
  obtenerVehiculoPorId, 
  obtenerClientePorId,
  compartirFotos,
  abrirWhatsApp
} = useAutoService()
const { generarPDFOrden } = usePDF()
const { initializeGoogleDrive, authenticateUser, subirOrdenAGoogleDrive, estaAutenticado, getDebugInfo, diagnosticarProblemas } = useGoogleDrive()
const { success, error } = useNotifications()
const router = useRouter()
const { guardando } = useDiskStorage()
const { formulario, ordenId: ordenBorradorId, versionOriginal, activo: borradorActivo, hayCambios, sesionDisponible, iniciar: iniciarBorrador, descartar: descartarBorrador, incorporarServicio } = useBorradorOrden()

// Estado del componente
const mostrarFormulario = ref(false)
const ordenEditando = computed(() => ordenBorradorId.value == null ? null : ordenesCompletas.value.find(orden => String(orden.id) === String(ordenBorradorId.value)))
const ordenACompartir = ref(null)
const servicioOrigenId = ref('')
const filtroTexto = ref('')
const filtroEstado = ref('')
const filtroPrioridad = ref('')
const filtroVehiculo = ref('')
const busquedaCliente = ref('')
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

const serviciosDelVehiculo = computed(() => servicios.value.filter(servicio =>
  formulario.value.vehiculoId && String(servicio.vehiculoId) === String(formulario.value.vehiculoId) && String(servicio.clienteId) === String(formulario.value.clienteId)
).sort((a, b) => String(b.fechaServicio).localeCompare(String(a.fechaServicio))))

// Computed
const ordenesFiltradas = computed(() => {
  let resultado = ordenesCompletas.value

  // Filtro por texto
  if (filtroTexto.value) {
    const filtro = filtroTexto.value.toLowerCase()
    resultado = resultado.filter(orden => 
      orden.numeroOrden.toLowerCase().includes(filtro) ||
      orden.descripcionTrabajo?.toLowerCase().includes(filtro) ||
      orden.cliente?.nombre?.toLowerCase().includes(filtro) ||
      coincideDniCuil(orden.cliente?.dniCuil, filtro)
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

const clientesDisponibles = computed(() => {
  const texto = busquedaCliente.value.trim().toLocaleLowerCase('es')
  return clientes.value.filter(cliente =>
    String(cliente.id) === String(formulario.value.clienteId) || !texto ||
    cliente.nombre?.toLocaleLowerCase('es').includes(texto) || coincideDniCuil(cliente.dniCuil, texto)
  )
})
const vehiculosDisponibles = computed(() => vehiculos.value.filter(vehiculo =>
  !formulario.value.clienteId || String(vehiculo.clienteId) === String(formulario.value.clienteId)
))
const onClienteChange = () => {
  servicioOrigenId.value = ''
  const disponibles = vehiculosDisponibles.value
  if (!disponibles.some(vehiculo => String(vehiculo.id) === String(formulario.value.vehiculoId))) {
    formulario.value.vehiculoId = ''
  }
  if (formulario.value.clienteId && disponibles.length === 1) formulario.value.vehiculoId = disponibles[0].id
}

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
  busquedaCliente.value = ''
  servicioOrigenId.value = ''
  descartarBorrador()
}

const onVehiculoChange = () => {
  servicioOrigenId.value = ''
  if (formulario.value.vehiculoId) {
    const vehiculo = obtenerVehiculoPorId(parseInt(formulario.value.vehiculoId))
    if (vehiculo) {
      formulario.value.clienteId = vehiculo.clienteId
    }
  }
}

const editarOrden = (orden) => {
  if (guardando.value) return
  if (borradorActivo.value && String(ordenBorradorId.value) === String(orden.id)) { reanudarBorrador(); return }
  if (borradorActivo.value && hayCambios.value && !confirm('Hay un borrador sin guardar. ¿Descartarlo para editar esta otra orden?')) return
  busquedaCliente.value = ''
  servicioOrigenId.value = ''
  iniciarBorrador(orden)
  mostrarFormulario.value = true
}

const reanudarBorrador = () => { mostrarFormulario.value = true }
const abrirNuevaOrden = () => {
  if (guardando.value) return
  if (!borradorActivo.value) iniciarBorrador()
  reanudarBorrador()
}
const traerServicio = () => {
  const servicio = servicios.value.find(item => String(item.id) === String(servicioOrigenId.value))
  if (!incorporarServicio(servicio)) { error('Seleccioná un servicio del mismo vehículo y cliente de la orden.'); return }
  success('Descripción y observaciones agregadas al borrador. Revisá y guardá la orden.')
  servicioOrigenId.value = ''
}

const guardarOrden = async () => {
  if (guardando.value) return
  if (ordenBorradorId.value != null && (!ordenEditando.value || firmaOrdenEditable(ordenEditando.value) !== versionOriginal.value)) {
    error('La orden original cambió o fue eliminada mientras existía este borrador. Conservá el texto y revisá la orden antes de reemplazar datos.', { persistent: true })
    return
  }
  // El cliente siempre pertenece al vehículo; el selector solo facilita encontrarlo.
  const vehiculo = obtenerVehiculoPorId(Number(formulario.value.vehiculoId))
  if (!vehiculo || !obtenerClientePorId(vehiculo.clienteId)) {
    error('Seleccioná un vehículo con un cliente registrado')
    return
  }
  formulario.value.clienteId = vehiculo.clienteId
  const datosOrden = {
    // Las fotos se guardan mediante sus propios eventos. El formulario no debe
    // reenviar una lista antigua de imágenes al actualizar la orden.
    estado: formulario.value.estado,
    prioridad: formulario.value.prioridad,
    descripcionTrabajo: formulario.value.descripcionTrabajo,
    observaciones: formulario.value.observaciones,
    vehiculoId: parseInt(formulario.value.vehiculoId),
    clienteId: parseInt(formulario.value.clienteId),
    costoEstimado: formulario.value.costoEstimado ? parseFloat(formulario.value.costoEstimado) : 0,
    fechaVencimiento: formulario.value.fechaVencimiento || null
  }

  const resultado = ordenEditando.value
    ? await actualizarOrden(ordenEditando.value.id, datosOrden)
    : await crearOrden(datosOrden)
  if (resultado) { mostrarFormulario.value = false; limpiarFormulario() }
}

const cancelarFormulario = () => {
  if (guardando.value) return
  if (hayCambios.value) borradorActivo.value = true
  else limpiarFormulario()
  mostrarFormulario.value = false
}
const descartarFormulario = () => {
  if (guardando.value || (hayCambios.value && !confirm('¿Descartar este borrador? Se perderá lo escrito sin guardar. Los registros guardados no se modifican.'))) return
  mostrarFormulario.value = false
  limpiarFormulario()
}
const fondoFormulario = crearCierreFondo(cancelarFormulario)
onBeforeUnmount(() => { if (mostrarFormulario.value) cancelarFormulario() })

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

const confirmarAccion = async () => {
  if (confirmacion.value.accion) {
    if (!await confirmacion.value.accion()) return
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
          await actualizarOrden(orden.id, {
            googleDriveFileId: resultado.fileId,
            googleDriveLink: resultado.webViewLink
          })
        }
      }
    }
  } catch (err) {
    console.error('Error al generar o subir el documento de la orden:', err)
    error('No se pudo generar o subir el documento de la orden. Intentá nuevamente.')
  }
}

// Funciones para manejo de imágenes
const handleImagenSubida = async (imagen) => {
  if (ordenEditando.value) {
    await agregarImagenAOrden(ordenEditando.value.id, imagen)
  }
}

const handleImagenEliminada = async (imagen) => {
  if (ordenEditando.value) {
    await eliminarImagenDeOrden(ordenEditando.value.id, imagen.fileId)
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

<style scoped>
.order-dialog .input-field,
.order-dialog .grid > div {
  min-width: 0;
  max-width: 100%;
}
</style>
