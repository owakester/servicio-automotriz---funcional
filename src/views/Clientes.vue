<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900">Clientes</h1>
      <button
        @click="mostrarFormulario = true"
        class="btn-primary flex items-center"
      >
        <Plus class="h-4 w-4 mr-2" aria-hidden="true" />
        Nuevo Cliente
      </button>
    </div>

    <!-- Filtros con icono de búsqueda -->
    <div v-if="clientes.length > 0" class="card">
    <div class="flex flex-col sm:flex-row gap-4">
    <div class="flex-1 relative">
    <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
    <input
    v-model="filtroTexto"
    type="text"
    placeholder="Buscar por nombre, DNI/CUIL, email o teléfono..."
      class="input-field pl-10"
        aria-label="Buscar clientes"
        />
        </div>
      <div class="flex items-center gap-2 text-sm text-gray-600">
          <span>Total: {{ clientes.length }} clientes</span>
        </div>
    </div>
    </div>

  <!-- Lista de Clientes con paginación -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div
      v-for="cliente in clientesPaginados"
      :key="cliente.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <User class="h-6 w-6 text-primary-600" />
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-semibold text-gray-900">{{ cliente.nombre }}</h3>
              <p class="text-sm text-gray-500">{{ cliente.email }}</p>
              <p v-if="cliente.dniCuil" class="text-sm text-gray-600">
                DNI/CUIL: {{ formatearDniCuil(cliente.dniCuil) }}
              </p>
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              @click="editarCliente(cliente)"
              class="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              :aria-label="`Editar cliente ${cliente.nombre}`"
              :title="`Editar cliente ${cliente.nombre}`"
            >
              <Edit2 class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              @click="eliminarClienteConfirm(cliente.id)"
              class="p-2 text-gray-400 hover:text-red-600 transition-colors"
              :aria-label="`Eliminar cliente ${cliente.nombre}`"
              :title="`Eliminar cliente ${cliente.nombre}`"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center text-sm text-gray-600">
            <Phone class="h-4 w-4 mr-2" />
            {{ formatearTelefonoDisplay(cliente.telefono) }}
            <!-- Botón WhatsApp -->
            <button
              v-if="cliente.telefono"
              @click="enviarWhatsApp(cliente)"
              class="ml-2 p-1 text-green-500 hover:text-green-700 transition-colors"
              title="Enviar WhatsApp"
              :aria-label="`Enviar WhatsApp a ${cliente.nombre}`"
            >
              <MessageCircle class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <MapPin class="h-4 w-4 mr-2" />
            {{ cliente.direccion }}
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <Calendar class="h-4 w-4 mr-2" />
            Cliente desde {{ new Date(cliente.fechaCreacion).toLocaleDateString('es-ES') }}
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700">
              {{ obtenerVehiculosPorCliente(cliente.id).length }} vehículo(s)
            </span>
            <router-link
              :to="`/vehiculos?cliente=${cliente.id}`"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              :aria-label="`Ver vehículos de ${cliente.nombre}`"
            >
              Ver vehículos
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="clientes.length > 0" class="col-span-full mt-6">
      <PaginationControls
        :current-page="currentPage"
        :total-pages="totalPages"
        :items-per-page="itemsPerPage"
        :pagination-info="paginationInfo"
        :page-range="pageRange"
        :go-to-page="goToPage"
        :next-page="nextPage"
        :prev-page="prevPage"
        :first-page="firstPage"
        :last-page="lastPage"
        @update:itemsPerPage="itemsPerPage = $event"
      />
    </div>

    <!-- Estado vacío -->
    <div v-if="clientesPaginados.length === 0" class="col-span-full text-center py-12">
      <User class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ filtroTexto ? 'No se encontraron clientes' : 'No hay clientes registrados' }}
      </h3>
      <p class="text-gray-500 mb-6">
        {{ filtroTexto ? 'Intenta con otros términos de búsqueda' : 'Empezá por el cliente para luego asociar sus vehículos y trabajos.' }}
      </p>
      <button
        v-if="!filtroTexto"
        @click="mostrarFormulario = true"
        class="btn-primary"
      >
        Agregar Cliente
      </button>
    </div>

    <!-- Modal Formulario -->
    <div
      v-if="mostrarFormulario"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="cancelarFormulario"
      @keydown.esc="cancelarFormulario"
    >
      <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="client-form-title" tabindex="-1">
        <h2 id="client-form-title" class="text-xl font-bold text-gray-900 mb-4">
          {{ clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente' }}
        </h2>

        <form @submit.prevent="guardarCliente" class="space-y-4">
          <div>
            <label for="client-name" class="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              v-model="formulario.nombre"
              id="client-name"
              autofocus
              type="text"
              required
              :class="[
                'input-field',
                getError('nombre') ? 'border-red-300 focus:ring-red-500' : ''
              ]"
              placeholder="Nombre completo"
              :aria-invalid="Boolean(getError('nombre'))"
              :aria-describedby="getError('nombre') ? 'client-name-error' : undefined"
            />
            <div v-if="getError('nombre')" id="client-name-error" class="mt-1 text-sm text-red-600">
              {{ getError('nombre') }}
            </div>
          </div>

          <div>
            <label for="client-document" class="block text-sm font-medium text-gray-700 mb-1">
              DNI/CUIL (opcional)
            </label>
            <input
              v-model="formulario.dniCuil"
              id="client-document"
              type="text"
              inputmode="numeric"
              :class="['input-field', getError('dniCuil') ? 'border-red-300 focus:ring-red-500' : '']"
              placeholder="Ej.: 12345678 o 20-12345678-6"
              :aria-invalid="Boolean(getError('dniCuil'))"
              :aria-describedby="getError('dniCuil') ? 'client-document-help client-document-error' : 'client-document-help'"
            />
            <p id="client-document-help" class="mt-1 text-xs text-gray-500">
              DNI: 7 u 8 dígitos. CUIL: 11 dígitos. Podés usar puntos o guiones.
            </p>
            <p v-if="getError('dniCuil')" id="client-document-error" class="mt-1 text-sm text-red-600">
              {{ getError('dniCuil') }}
            </p>
          </div>

          <div>
            <label for="client-email" class="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              v-model="formulario.email"
              id="client-email"
              type="email"
              required
              :class="[
                'input-field',
                getError('email') ? 'border-red-300 focus:ring-red-500' : ''
              ]"
              placeholder="ejemplo@correo.com"
              :aria-invalid="Boolean(getError('email'))"
              :aria-describedby="getError('email') ? 'client-email-error' : undefined"
            />
            <div v-if="getError('email')" id="client-email-error" class="mt-1 text-sm text-red-600">
              {{ getError('email') }}
            </div>
          </div>

          <div>
            <label for="client-phone" class="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              v-model="formulario.telefono"
              id="client-phone"
              type="tel"
              required
              :class="[
                'input-field',
                getError('telefono') ? 'border-red-300 focus:ring-red-500' : ''
              ]"
              placeholder="123-456-7890"
              :aria-invalid="Boolean(getError('telefono'))"
              :aria-describedby="getError('telefono') ? 'client-phone-error' : undefined"
            />
            <div v-if="getError('telefono')" id="client-phone-error" class="mt-1 text-sm text-red-600">
              {{ getError('telefono') }}
            </div>
          </div>

          <div>
            <label for="client-address" class="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <textarea
              v-model="formulario.direccion"
              id="client-address"
              class="input-field"
              rows="2"
              placeholder="Dirección completa"
            ></textarea>
          </div>

          <div>
            <label for="client-notes" class="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              v-model="formulario.notas"
              id="client-notes"
              class="input-field"
              rows="3"
              placeholder="Notas adicionales sobre el cliente"
            ></textarea>
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
              {{ clienteEditando ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Dialog de Confirmación -->
    <ConfirmDialog
      :show="mostrarConfirmacion"
      title="Eliminar Cliente"
      :message="`¿Estás seguro de que deseas eliminar al cliente ${etiquetaCliente(clienteAEliminar)}?`"
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      type="danger"
      @confirm="confirmarEliminarCliente"
      @cancel="cancelarEliminarCliente"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Plus, 
  User, 
  Edit2, 
  Trash2, 
  Phone, 
  MapPin, 
  Calendar,
  MessageCircle,
  Search
} from 'lucide-vue-next'
import { useAutoService } from '../composables/useAutoService'
import { useFormValidation } from '../composables/useFormValidation'
import { usePagination } from '../composables/usePagination'
import { useDebounce, useMemoize } from '../composables/useOptimization'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useNotifications } from '../composables/useNotifications'
import PaginationControls from '../components/PaginationControls.vue'
import { formatearDniCuil, etiquetaCliente } from '../utils/clientIdentity'

const {
  clientes,
  vehiculos,
  agregarCliente,
  actualizarCliente,
  eliminarCliente,
  contactoRapido,
  abrirWhatsApp,
  formatearTelefonoDisplay
} = useAutoService()

const {
  validateRequired,
  validateEmail,
  validatePhone,
  validateDniCuil,
  hasErrors,
  getError,
  clearErrors
} = useFormValidation()

// Estado del componente
const mostrarFormulario = ref(false)
const clienteEditando = ref(null)
const mostrarConfirmacion = ref(false)
const { warning } = useNotifications()
const clienteAEliminar = ref(null)

// Paginación
const {
  currentPage,
  itemsPerPage,
  searchQuery,
  paginatedItems: clientesPaginados,
  totalPages,
  paginationInfo,
  pageRange,
  goToPage,
  nextPage,
  prevPage,
  firstPage,
  lastPage
} = usePagination(clientes, 12)

// Debounce para la búsqueda
const filtroTexto = useDebounce(searchQuery, 300)

// Formulario
const formulario = ref({
  nombre: '',
  dniCuil: '',
  email: '',
  telefono: '',
  direccion: '',
  notas: ''
})

// Computed con memoización para evitar re-cálculos innecesarios
const vehiculosPorCliente = useMemoize(
  () => {
    const vehiculosPorCliente = {}
    vehiculos.value.forEach(v => {
      if (!vehiculosPorCliente[v.clienteId]) {
        vehiculosPorCliente[v.clienteId] = []
      }
      vehiculosPorCliente[v.clienteId].push(v)
    })
    return vehiculosPorCliente
  },
  [vehiculos]
)

// Función helper para obtener vehículos de un cliente
const obtenerVehiculosPorCliente = (clienteId) => {
  return vehiculosPorCliente.value[clienteId] || []
}

// Funciones

const limpiarFormulario = () => {
  formulario.value = {
    nombre: '',
    dniCuil: '',
    email: '',
    telefono: '',
    direccion: '',
    notas: ''
  }
}

const editarCliente = (cliente) => {
  clienteEditando.value = cliente
  formulario.value = { dniCuil: '', ...cliente }
  mostrarFormulario.value = true
}

const guardarCliente = () => {
  // Validar formulario
  clearErrors()
  const esValido = [
    validateRequired(formulario.value.nombre, 'nombre'),
    validateDniCuil(formulario.value.dniCuil),
    validateRequired(formulario.value.email, 'email'),
    validateEmail(formulario.value.email, 'email'),
    validateRequired(formulario.value.telefono, 'telefono'),
    validatePhone(formulario.value.telefono, 'telefono')
  ].every(Boolean)

  if (!esValido) return

  const resultado = clienteEditando.value
    ? actualizarCliente(clienteEditando.value.id, formulario.value)
    : agregarCliente(formulario.value)
  if (resultado) cancelarFormulario()
}

const cancelarFormulario = () => {
  mostrarFormulario.value = false
  clienteEditando.value = null
  limpiarFormulario()
  clearErrors()
}

const eliminarClienteConfirm = (clienteId) => {
  const vehiculosCliente = obtenerVehiculosPorCliente(clienteId)
  
  if (vehiculosCliente.length > 0) {
    warning('No se puede eliminar el cliente porque tiene vehículos asociados.')
    return
  }
  
  clienteAEliminar.value = clientes.value.find(c => c.id === clienteId)
  mostrarConfirmacion.value = true
}

const confirmarEliminarCliente = () => {
  if (clienteAEliminar.value) {
    eliminarCliente(clienteAEliminar.value.id)
  }
  cancelarEliminarCliente()
}

const cancelarEliminarCliente = () => {
  mostrarConfirmacion.value = false
  clienteAEliminar.value = null
}

// Función para enviar WhatsApp
const enviarWhatsApp = (cliente) => {
  const enlace = contactoRapido(cliente)
  if (enlace) {
    abrirWhatsApp(enlace)
  }
}
</script>
