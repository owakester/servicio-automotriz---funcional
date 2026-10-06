<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900">Vehículos</h1>
      <button
        v-if="clientes.length > 0"
        @click="mostrarFormulario = true"
        class="btn-primary flex items-center"
      >
        <Plus class="h-4 w-4 mr-2" aria-hidden="true" />
        Nuevo Vehículo
      </button>
      <router-link v-else to="/clientes" class="btn-primary inline-flex items-center">
        <User class="h-4 w-4 mr-2" aria-hidden="true" />
        Agregar cliente primero
      </router-link>
    </div>

    <!-- Filtros -->
    <div v-if="vehiculos.length > 0" class="card">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            v-model="filtroTexto"
            type="text"
            placeholder="Buscar por patente, marca o modelo..."
            class="input-field"
          />
        </div>
        <div>
          <select v-model="filtroCliente" class="input-field">
            <option value="">Todos los clientes</option>
            <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
              {{ cliente.nombre }}
            </option>
          </select>
        </div>
        <div>
          <select v-model="filtroAlerta" class="input-field">
            <option value="">Todas las alertas</option>
            <option value="vencido">Servicios vencidos</option>
            <option value="urgente">Servicios urgentes</option>
            <option value="proximo">Servicios próximos</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lista de Vehículos -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="vehiculo in vehiculosFiltrados"
        :key="vehiculo.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <!-- Alerta de servicio -->
        <div
          v-if="vehiculo.alerta"
          :class="[
            'mb-4 p-3 rounded-lg border-l-4',
            vehiculo.alerta.tipo === 'vencido' ? 'bg-red-50 border-red-400' :
            vehiculo.alerta.tipo === 'urgente' ? 'bg-orange-50 border-orange-400' :
            'bg-yellow-50 border-yellow-400'
          ]"
        >
          <div class="flex items-center">
            <AlertTriangle 
              :class="[
                'h-5 w-5 mr-2',
                vehiculo.alerta.tipo === 'vencido' ? 'text-red-600' :
                vehiculo.alerta.tipo === 'urgente' ? 'text-orange-600' :
                'text-yellow-600'
              ]"
            />
            <span 
              :class="[
                'text-sm font-medium',
                vehiculo.alerta.tipo === 'vencido' ? 'text-red-800' :
                vehiculo.alerta.tipo === 'urgente' ? 'text-orange-800' :
                'text-yellow-800'
              ]"
            >
              {{ getAlertaTexto(vehiculo.alerta) }}
            </span>
          </div>
        </div>

        <!-- Información del vehículo -->
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Car class="h-6 w-6 text-blue-600" />
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ vehiculo.marca }} {{ vehiculo.modelo }}
              </h3>
              <p class="text-sm text-gray-500">{{ vehiculo.patente }}</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              @click="editarVehiculo(vehiculo)"
              class="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              :aria-label="`Editar vehículo ${vehiculo.patente}`"
              :title="`Editar vehículo ${vehiculo.patente}`"
            >
              <Edit2 class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              @click="eliminarVehiculoConfirm(vehiculo.id)"
              class="p-2 text-gray-400 hover:text-red-600 transition-colors"
              :aria-label="`Eliminar vehículo ${vehiculo.patente}`"
              :title="`Eliminar vehículo ${vehiculo.patente}`"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- Detalles del vehículo -->
        <div class="space-y-2">
          <div class="flex items-center text-sm text-gray-600">
            <User class="h-4 w-4 mr-2" />
            {{ vehiculo.cliente?.nombre || 'Sin cliente asignado' }}
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <Calendar class="h-4 w-4 mr-2" />
            Año: {{ vehiculo.anio }}
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <Gauge class="h-4 w-4 mr-2" />
            {{ vehiculo.kilometraje?.toLocaleString() || 0 }} km
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <Palette class="h-4 w-4 mr-2" />
            {{ vehiculo.color }}
          </div>
        </div>

        <!-- Último servicio -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div v-if="vehiculo.ultimoServicio" class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Último servicio:</span>
              <span class="text-sm text-gray-600">
                {{ new Date(vehiculo.ultimoServicio.fechaServicio).toLocaleDateString('es-ES') }}
              </span>
            </div>
            <div class="text-sm text-gray-600">
              {{ vehiculo.ultimoServicio.tipoServicio }}
            </div>
            <div v-if="vehiculo.ultimoServicio.proximoServicio" class="text-sm text-gray-600">
              Próximo: {{ new Date(vehiculo.ultimoServicio.proximoServicio).toLocaleDateString('es-ES') }}
            </div>
          </div>
          <div v-else class="text-sm text-gray-500 italic">
            Sin servicios registrados
          </div>
        </div>

        <!-- Acciones -->
        <div class="mt-4 space-y-2">
          <div class="flex space-x-2">
            <button
              @click="verHistorialServicios(vehiculo)"
              class="flex-1 btn-secondary text-sm"
            >
              <History class="h-4 w-4 mr-1" />
              Historial
            </button>
            <button
              @click="nuevoServicio(vehiculo)"
              class="flex-1 btn-primary text-sm"
            >
              <Wrench class="h-4 w-4 mr-1" />
              Servicio
            </button>
          </div>
          <!-- Botón WhatsApp para recordatorio -->
          <button
            v-if="vehiculo.alerta && vehiculo.cliente?.telefono"
            @click="enviarRecordatorioWhatsApp(vehiculo)"
            class="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-sm"
          >
            <MessageCircle class="h-4 w-4 mr-1" />
            Recordatorio WhatsApp
          </button>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-if="vehiculosFiltrados.length === 0" class="text-center py-12">
      <Car class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ filtroTexto || filtroCliente || filtroAlerta ? 'No se encontraron vehículos' : clientes.length === 0 ? 'Primero registrá un cliente' : 'No hay vehículos registrados' }}
      </h3>
      <p class="text-gray-500 mb-6">
        {{ filtroTexto || filtroCliente || filtroAlerta ? 'Intenta con otros filtros' : clientes.length === 0 ? 'Todo vehículo debe quedar asociado a su dueño.' : 'Agregá el primer vehículo del taller.' }}
      </p>
      <button
        v-if="!filtroTexto && !filtroCliente && !filtroAlerta"
        @click="clientes.length === 0 ? router.push('/clientes') : (mostrarFormulario = true)"
        class="btn-primary"
      >
        {{ clientes.length === 0 ? 'Ir a Clientes' : 'Agregar Vehículo' }}
      </button>
    </div>

    <!-- Modal Formulario -->
    <div
      v-if="mostrarFormulario"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="cancelarFormulario"
      @keydown.esc="cancelarFormulario"
    >
      <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title" tabindex="-1">
        <h2 id="vehicle-form-title" class="text-xl font-bold text-gray-900 mb-4">
          {{ vehiculoEditando ? 'Editar Vehículo' : 'Nuevo Vehículo' }}
        </h2>

        <form @submit.prevent="guardarVehiculo" class="space-y-4">
          <div>
            <label for="vehicle-client" class="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              v-model="formulario.clienteId"
              id="vehicle-client"
              autofocus
              required
              class="input-field"
            >
              <option value="">Seleccionar cliente</option>
              <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
                {{ cliente.nombre }}
              </option>
            </select>
          </div>

          <div>
            <label for="vehicle-plate" class="block text-sm font-medium text-gray-700 mb-1">
              Patente *
            </label>
            <input
              v-model="formulario.patente"
              id="vehicle-plate"
              type="text"
              required
              class="input-field"
              placeholder="ABC123"
              style="text-transform: uppercase"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="vehicle-brand" class="block text-sm font-medium text-gray-700 mb-1">
                Marca *
              </label>
              <input
                v-model="formulario.marca"
                id="vehicle-brand"
                type="text"
                required
                class="input-field"
                placeholder="Toyota"
              />
            </div>
            <div>
              <label for="vehicle-model" class="block text-sm font-medium text-gray-700 mb-1">
                Modelo *
              </label>
              <input
                v-model="formulario.modelo"
                id="vehicle-model"
                type="text"
                required
                class="input-field"
                placeholder="Corolla"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="vehicle-year" class="block text-sm font-medium text-gray-700 mb-1">
                Año *
              </label>
              <input
                v-model="formulario.anio"
                id="vehicle-year"
                type="number"
                required
                min="1900"
                :max="new Date().getFullYear() + 1"
                class="input-field"
                placeholder="2020"
              />
            </div>
            <div>
              <label for="vehicle-color" class="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                v-model="formulario.color"
                id="vehicle-color"
                type="text"
                class="input-field"
                placeholder="Blanco"
              />
            </div>
          </div>

          <div>
            <label for="vehicle-mileage" class="block text-sm font-medium text-gray-700 mb-1">
              Kilometraje
            </label>
            <input
              v-model="formulario.kilometraje"
              id="vehicle-mileage"
              type="number"
              min="0"
              class="input-field"
              placeholder="50000"
            />
          </div>

          <div>
            <label for="vehicle-engine" class="block text-sm font-medium text-gray-700 mb-1">
              Número de Motor
            </label>
            <input
              v-model="formulario.numeroMotor"
              id="vehicle-engine"
              type="text"
              class="input-field"
              placeholder="1234567890"
            />
          </div>

          <div>
            <label for="vehicle-chassis" class="block text-sm font-medium text-gray-700 mb-1">
              Número de Chasis
            </label>
            <input
              v-model="formulario.numeroChasis"
              id="vehicle-chassis"
              type="text"
              class="input-field"
              placeholder="ABCD1234567890"
            />
          </div>

          <div>
            <label for="vehicle-notes" class="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              v-model="formulario.notas"
              id="vehicle-notes"
              class="input-field"
              rows="3"
              placeholder="Notas adicionales sobre el vehículo"
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
              {{ vehiculoEditando ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      :show="mostrarConfirmacion"
      title="Eliminar Vehículo"
      :message="`\u00bfEstás seguro de que deseas eliminar el vehículo ${vehiculoAEliminar?.patente}?`"
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      type="danger"
      @confirm="confirmarEliminarVehiculo"
      @cancel="cancelarEliminarVehiculo"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Plus, 
  Car, 
  Edit2, 
  Trash2, 
  User, 
  Calendar, 
  Gauge, 
  Palette, 
  AlertTriangle,
  History,
  Wrench,
  MessageCircle
} from 'lucide-vue-next'
import { useAutoService } from '../composables/useAutoService'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useNotifications } from '../composables/useNotifications'

const router = useRouter()
const route = useRoute()

const {
  clientes,
  vehiculos,
  ordenes,
  vehiculosConAlertas,
  agregarVehiculo,
  actualizarVehiculo,
  eliminarVehiculo,
  obtenerServiciosPorVehiculo,
  recordatorioProximoServicio,
  abrirWhatsApp
} = useAutoService()

// Estado del componente
const mostrarFormulario = ref(false)
const vehiculoEditando = ref(null)
const filtroTexto = ref('')
const filtroCliente = ref(route.query.cliente || '')
const filtroAlerta = ref('')
const mostrarConfirmacion = ref(false)
const vehiculoAEliminar = ref(null)
const { warning } = useNotifications()

// Formulario
const formulario = ref({
  clienteId: '',
  patente: '',
  marca: '',
  modelo: '',
  anio: '',
  color: '',
  kilometraje: '',
  numeroMotor: '',
  numeroChasis: '',
  notas: ''
})

// Computed
const vehiculosFiltrados = computed(() => {
  let resultado = vehiculosConAlertas.value
  
  // Filtro por texto
  if (filtroTexto.value) {
    const filtro = filtroTexto.value.toLowerCase()
    resultado = resultado.filter(vehiculo => 
      vehiculo.patente.toLowerCase().includes(filtro) ||
      vehiculo.marca.toLowerCase().includes(filtro) ||
      vehiculo.modelo.toLowerCase().includes(filtro)
    )
  }
  
  // Filtro por cliente
  if (filtroCliente.value) {
    resultado = resultado.filter(vehiculo => 
      vehiculo.clienteId === parseInt(filtroCliente.value)
    )
  }
  
  // Filtro por alerta
  if (filtroAlerta.value) {
    resultado = resultado.filter(vehiculo => 
      vehiculo.alerta?.tipo === filtroAlerta.value
    )
  }
  
  return resultado
})

// Funciones
const getAlertaTexto = (alerta) => {
  switch (alerta.tipo) {
    case 'vencido':
      return `Servicio vencido hace ${alerta.dias} días`
    case 'urgente':
      return `Servicio en ${alerta.dias} días`
    case 'proximo':
      return `Servicio en ${alerta.dias} días`
    default:
      return ''
  }
}

const limpiarFormulario = () => {
  formulario.value = {
    clienteId: '',
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    kilometraje: '',
    numeroMotor: '',
    numeroChasis: '',
    notas: ''
  }
}

const editarVehiculo = (vehiculo) => {
  vehiculoEditando.value = vehiculo
  formulario.value = { ...vehiculo }
  mostrarFormulario.value = true
}

const guardarVehiculo = () => {
  const datosVehiculo = {
    ...formulario.value,
    patente: formulario.value.patente.toUpperCase(),
    anio: parseInt(formulario.value.anio),
    kilometraje: formulario.value.kilometraje ? parseInt(formulario.value.kilometraje) : 0,
    clienteId: parseInt(formulario.value.clienteId)
  }

  const resultado = vehiculoEditando.value
    ? actualizarVehiculo(vehiculoEditando.value.id, datosVehiculo)
    : agregarVehiculo(datosVehiculo)
  if (resultado) cancelarFormulario()
}

const cancelarFormulario = () => {
  mostrarFormulario.value = false
  vehiculoEditando.value = null
  limpiarFormulario()
}

const eliminarVehiculoConfirm = (vehiculoId) => {
  const serviciosVehiculo = obtenerServiciosPorVehiculo(vehiculoId)
  const ordenesVehiculo = ordenes.value.filter(orden => orden.vehiculoId === vehiculoId)
  
  if (serviciosVehiculo.length > 0 || ordenesVehiculo.length > 0) {
    warning('No se puede eliminar el vehículo porque tiene servicios u órdenes asociadas.')
    return
  }
  
  vehiculoAEliminar.value = vehiculos.value.find(vehiculo => vehiculo.id === vehiculoId)
  mostrarConfirmacion.value = true
}

const confirmarEliminarVehiculo = () => {
  if (vehiculoAEliminar.value) eliminarVehiculo(vehiculoAEliminar.value.id)
  cancelarEliminarVehiculo()
}

const cancelarEliminarVehiculo = () => {
  mostrarConfirmacion.value = false
  vehiculoAEliminar.value = null
}

const verHistorialServicios = (vehiculo) => {
  router.push(`/servicios?vehiculo=${vehiculo.id}`)
}

const nuevoServicio = (vehiculo) => {
  router.push(`/servicios?nuevo=true&vehiculo=${vehiculo.id}`)
}

// Función para enviar recordatorio de próximo servicio por WhatsApp
const enviarRecordatorioWhatsApp = (vehiculo) => {
  const enlace = recordatorioProximoServicio(vehiculo, vehiculo.cliente)
  if (enlace) {
    abrirWhatsApp(enlace)
  }
}
</script>
