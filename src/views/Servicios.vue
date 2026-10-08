<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900">Servicios</h1>
      <button
        v-if="vehiculos.length > 0"
        @click="mostrarFormulario = true"
        class="btn-primary flex items-center"
      >
        <Plus class="h-4 w-4 mr-2" />
        Nuevo Servicio
      </button>
      <router-link v-else to="/vehiculos" class="btn-primary inline-flex items-center">
        <Car class="h-4 w-4 mr-2" aria-hidden="true" />
        Agregar vehículo primero
      </router-link>
    </div>

    <!-- Filtros con mejoras de búsqueda -->
    <div v-if="servicios.length > 0" class="card">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            v-model="filtroTexto"
            type="text"
            placeholder="Buscar por servicio, vehículo, cliente o DNI/CUIL..."
            class="input-field pl-10"
            aria-label="Buscar servicios"
          />
        </div>
        <div>
          <select v-model="filtroVehiculo" class="input-field">
            <option value="">Todos los vehículos</option>
            <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
              {{ vehiculo.marca }} {{ vehiculo.modelo }} - {{ vehiculo.patente }}
            </option>
          </select>
        </div>
        <div>
          <select v-model="filtroCliente" class="input-field">
            <option value="">Todos los clientes</option>
            <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
              {{ etiquetaCliente(cliente) }}
            </option>
          </select>
        </div>
        <div>
          <select v-model="filtroEstado" class="input-field">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En progreso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      
      <!-- ✅ INDICADOR DE RESULTADOS MEJORADO -->
      <div class="mt-4 flex justify-between items-center text-sm text-gray-600">
        <div class="flex items-center gap-4">
          <span>Mostrando {{ serviciosFiltrados.length }} de {{ servicios.length }} servicios</span>
          <button 
            v-if="hayFiltros"
            @click="limpiarFiltros"
            class="text-blue-600 hover:text-blue-800 text-sm"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Lista de Servicios con opción de Virtual Scroll -->
    <div class="card">
      <!-- Lista Virtual para grandes cantidades de datos -->
      <VirtualList
        v-if="serviciosFiltrados.length > 50"
        :items="serviciosFiltrados"
        :item-height="80"
        container-height="600px"
        :buffer="5"
        key-field="id"
      >
        <template #default="{ item: servicio }">
          <div class="border-b border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors">
            <div class="grid grid-cols-9 gap-4 items-center">
              <!-- Vehículo -->
              <div class="col-span-2">
                <div class="flex items-center">
                  <Car class="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {{ servicio.vehiculo?.marca }} {{ servicio.vehiculo?.modelo }}
                    </div>
                    <div class="text-sm text-gray-500">{{ servicio.vehiculo?.patente }}</div>
                  </div>
                </div>
              </div>
              
              <!-- Cliente -->
              <div>
                <ClienteIdentificacion class="text-sm text-gray-900" :cliente="servicio.cliente" />
                <div class="text-sm text-gray-500">{{ formatearTelefonoDisplay(servicio.cliente?.telefono) }}</div>
              </div>
              
              <!-- Tipo de Servicio y Fecha -->
              <div>
                <div class="text-sm font-medium text-gray-900">{{ servicio.tipoServicio }}</div>
                <div class="text-xs text-gray-500">{{ formatearFecha(servicio.fechaServicio) }}</div>
              </div>
              
              <!-- Próximo Servicio -->
              <div>
                <div class="text-sm text-gray-900">
                  <ProximoServicio :servicio="servicio" />
                </div>
              </div>
              
              <!-- Días Restantes -->
              <div>
                <ProximoServicio :servicio="servicio" campo="dias" />
              </div>
              
              <!-- Estado -->
              <div>
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    servicio.estado === 'completado' ? 'bg-green-100 text-green-900' :
                    servicio.estado === 'en_progreso' ? 'bg-blue-100 text-blue-900' :
                    servicio.estado === 'pendiente' ? 'bg-amber-100 text-amber-900' :
                    'bg-red-100 text-red-900'
                  ]"
                >
                  {{ formatearEstado(servicio.estado) }}
                </span>
              </div>
              
              <!-- Costo -->
              <div class="text-right">
                <div class="text-sm font-medium text-gray-900">
                  ${{ servicio.costo?.toLocaleString() || '0' }}
                </div>
              </div>
              
              <!-- Acciones -->
              <div class="flex justify-end space-x-2">
                <button @click="verServicio(servicio)" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Ver detalle del servicio" :aria-label="`Ver detalle del servicio ${servicio.tipoServicio} de ${servicio.vehiculo?.patente || 'vehículo'}`">
                  <Eye class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  @click="editarServicio(servicio)"
                  class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  title="Editar servicio"
                  :aria-label="`Editar servicio ${servicio.tipoServicio} de ${servicio.vehiculo?.patente || 'vehículo'}`"
                >
                  <Edit2 class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  @click="eliminarServicioConfirm(servicio.id)"
                  class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar servicio"
                  :aria-label="`Eliminar servicio ${servicio.tipoServicio} de ${servicio.vehiculo?.patente || 'vehículo'}`"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </VirtualList>

      <!-- Tabla tradicional para cantidades pequeñas -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehículo
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo de Servicio
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Próximo Servicio
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Días Restantes
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Costo Final
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="servicio in paginatedServicios" 
              :key="servicio.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <Car class="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {{ servicio.vehiculo?.marca }} {{ servicio.vehiculo?.modelo }}
                    </div>
                    <div class="text-sm text-gray-500">{{ servicio.vehiculo?.patente }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <ClienteIdentificacion class="text-sm text-gray-900" :cliente="servicio.cliente" />
                <div class="text-sm text-gray-500">{{ formatearTelefonoDisplay(servicio.cliente?.telefono) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ servicio.tipoServicio }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatearFecha(servicio.fechaServicio) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <ProximoServicio :servicio="servicio" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <ProximoServicio :servicio="servicio" campo="dias" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    servicio.estado === 'completado' ? 'bg-green-100 text-green-900' :
                    servicio.estado === 'en_progreso' ? 'bg-blue-100 text-blue-900' :
                    servicio.estado === 'pendiente' ? 'bg-amber-100 text-amber-900' :
                    'bg-red-100 text-red-900'
                  ]"
                >
                  {{ formatearEstado(servicio.estado) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${{ servicio.costo?.toLocaleString() || '0' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button @click="verServicio(servicio)" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Ver detalle del servicio" :aria-label="`Ver detalle del servicio ${servicio.tipoServicio} de ${servicio.vehiculo?.patente || 'vehículo'}`">
                    <Eye class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    @click="editarServicio(servicio)"
                    class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  title="Editar servicio"
                  :aria-label="`Editar servicio ${servicio.tipoServicio} de ${servicio.vehiculo?.patente || 'vehículo'}`"
                  >
                    <Edit2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    @click="eliminarServicioConfirm(servicio.id)"
                    class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar servicio"
                  :aria-label="`Eliminar servicio ${servicio.tipoServicio} de ${servicio.vehiculo?.patente || 'vehículo'}`"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Paginación para tabla tradicional -->
        <div v-if="totalPages > 1" class="mt-4">
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
        <div v-if="serviciosFiltrados.length === 0" class="text-center py-12">
          <Wrench class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ hayFiltros ? 'No se encontraron servicios' : vehiculos.length === 0 ? 'Primero registrá un vehículo' : 'No hay servicios registrados' }}
          </h3>
          <p class="text-gray-500 mb-6">
            {{ hayFiltros ? 'Intenta con otros filtros' : vehiculos.length === 0 ? 'El servicio necesita un vehículo y un cliente asociados.' : 'Registrá el trabajo realizado para conservar el historial.' }}
          </p>
          <button
            v-if="!hayFiltros"
            @click="vehiculos.length === 0 ? router.push('/vehiculos') : (mostrarFormulario = true)"
            class="btn-primary"
          >
            {{ vehiculos.length === 0 ? 'Ir a Vehículos' : 'Agregar Servicio' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Formulario -->
    <div v-if="servicioDetalle" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="cerrarDetalle" @keydown.esc="cerrarDetalle">
      <section ref="detalleDialogo" v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="service-detail-title" tabindex="-1">
        <div class="flex items-start justify-between gap-4 mb-4">
          <h2 id="service-detail-title" class="text-xl font-bold text-gray-900">Detalle del servicio</h2>
          <button type="button" @click="cerrarDetalle" class="p-2 rounded hover:bg-gray-100" aria-label="Cerrar detalle del servicio"><X class="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <p class="mb-4 text-sm text-gray-500">Solo lectura: consultar este detalle no modifica el servicio.</p>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><dt class="font-semibold text-gray-600">Cliente</dt><dd><ClienteIdentificacion :cliente="servicioDetalle.cliente" /></dd></div>
          <div><dt class="font-semibold text-gray-600">Vehículo</dt><dd>{{ servicioDetalle.vehiculo?.marca }} {{ servicioDetalle.vehiculo?.modelo }} — {{ servicioDetalle.vehiculo?.patente || 'No especificado' }}</dd></div>
          <div><dt class="font-semibold text-gray-600">Tipo de servicio</dt><dd>{{ servicioDetalle.tipoServicio }}</dd></div>
          <div><dt class="font-semibold text-gray-600">Estado</dt><dd>{{ formatearEstado(servicioDetalle.estado) }}</dd></div>
          <div><dt class="font-semibold text-gray-600">Fecha del servicio</dt><dd>{{ formatearFecha(servicioDetalle.fechaServicio) }}</dd></div>
          <div><dt class="font-semibold text-gray-600">Próximo servicio</dt><dd><ProximoServicio :servicio="servicioDetalle" /><div class="mt-1"><ProximoServicio :servicio="servicioDetalle" campo="dias" /></div></dd></div>
          <div><dt class="font-semibold text-gray-600">Costo final</dt><dd>${{ Number(servicioDetalle.costo || 0).toLocaleString('es-AR') }}</dd></div>
          <div><dt class="font-semibold text-gray-600">Kilometraje registrado</dt><dd>{{ servicioDetalle.kilometrajeActual == null ? 'No registrado' : `${Number(servicioDetalle.kilometrajeActual).toLocaleString('es-AR')} km` }}</dd></div>
          <div class="sm:col-span-2"><dt class="font-semibold text-gray-600">Descripción del trabajo</dt><dd class="whitespace-pre-wrap break-words mt-1">{{ servicioDetalle.descripcion || 'Sin descripción' }}</dd></div>
          <div class="sm:col-span-2"><dt class="font-semibold text-gray-600">Observaciones</dt><dd class="whitespace-pre-wrap break-words mt-1">{{ servicioDetalle.observaciones || 'Sin observaciones' }}</dd></div>
        </dl>
        <div class="flex justify-end mt-6"><button type="button" @click="cerrarDetalle" class="btn-secondary">Cerrar</button></div>
      </section>
    </div>

    <div
      v-if="mostrarFormulario"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="cancelarFormulario"
      @keydown.esc="cancelarFormulario"
    >
      <div v-focus-trap class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="service-form-title" tabindex="-1">
        <h2 id="service-form-title" class="text-xl font-bold text-gray-900 mb-4">
          {{ servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio' }}
        </h2>

        <form @submit.prevent="guardarServicio" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="service-vehicle" class="block text-sm font-medium text-gray-700 mb-1">
                Vehículo *
              </label>
              <select
                v-model="formulario.vehiculoId"
                id="service-vehicle"
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
              <label for="service-client" class="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                :value="etiquetaCliente(clienteSeleccionado)"
                id="service-client"
                type="text"
                readonly
                class="input-field bg-gray-50"
                placeholder="Se selecciona automáticamente"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="service-type" class="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Servicio *
              </label>
              <select
                v-model="formulario.tipoServicio"
                id="service-type"
                required
                class="input-field"
                @change="onTipoServicioChange"
              >
                <option value="">Seleccionar tipo</option>
                <option value="Cambio de aceite">Cambio de aceite</option>
                <option value="Mantenimiento general">Mantenimiento general</option>
                <option value="Reparación de frenos">Reparación de frenos</option>
                <option value="Cambio de filtros">Cambio de filtros</option>
                <option value="Alineación y balanceo">Alineación y balanceo</option>
                <option value="Reparación de motor">Reparación de motor</option>
                <option value="Cambio de neumáticos">Cambio de neumáticos</option>
                <option value="Mantenimiento preventivo">Mantenimiento preventivo</option>
                <option value="Diagnóstico">Diagnóstico</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label for="service-date" class="block text-sm font-medium text-gray-700 mb-1">
                Fecha del Servicio *
              </label>
              <input
                v-model="formulario.fechaServicio"
                id="service-date"
                type="date"
                required
                class="input-field"
                @change="onFechaServicioChange"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="service-status" class="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                v-model="formulario.estado"
                id="service-status"
                required
                class="input-field"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En progreso</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label for="service-cost" class="block text-sm font-medium text-gray-700 mb-1">
                Costo Final ($) *
              </label>
              <input
                v-model="formulario.costo"
                id="service-cost"
                type="number"
                min="0"
                step="0.01"
                class="input-field"
                placeholder="Precio final cobrado"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="service-mileage" class="block text-sm font-medium text-gray-700 mb-1">
                Kilometraje actual
              </label>
              <input
                v-model="formulario.kilometrajeActual"
                id="service-mileage"
                type="number"
                min="0"
                class="input-field"
                placeholder="Kilometraje al momento del servicio"
              />
            </div>

            <div>
              <label for="service-next-date" class="block text-sm font-medium text-gray-700 mb-1">
                Próximo servicio (fecha)
                <span v-if="formulario.tipoServicio === 'Mantenimiento general'" class="text-xs text-blue-600">
                  ✨ Se calcula automáticamente (+1 año)
                </span>
              </label>
              <input
                v-model="formulario.proximoServicio"
                id="service-next-date"
                type="date"
                class="input-field"
                :class="{
                  'bg-blue-50 border-blue-300': formulario.tipoServicio === 'Mantenimiento general'
                }"
              />
            </div>
          </div>

          <div>
            <label for="service-description" class="block text-sm font-medium text-gray-700 mb-1">
              Descripción del servicio
            </label>
            <textarea
              v-model="formulario.descripcion"
              id="service-description"
              class="input-field"
              rows="3"
              placeholder="Describe el trabajo realizado..."
            ></textarea>
          </div>

          <div>
            <label for="service-observations" class="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              v-model="formulario.observaciones"
              id="service-observations"
              class="input-field"
              rows="3"
              placeholder="Observaciones adicionales..."
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
              {{ servicioEditando ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      :show="mostrarConfirmacion"
      title="Eliminar Servicio"
      message="¿Estás seguro de que deseas eliminar este servicio?"
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      type="danger"
      @confirm="confirmarEliminarServicio"
      @cancel="cancelarEliminarServicio"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Plus, 
  Car, 
  Edit2, 
  Eye,
  X,
  Trash2, 
  Wrench,
  Search
} from 'lucide-vue-next'
import { useAutoService } from '../composables/useAutoService'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { usePagination } from '../composables/usePagination'
import { useDebounce, useMemoize } from '../composables/useOptimization'
import { useMemoryLeakPrevention } from '../composables/useMemoryLeakPrevention'
import VirtualList from '../components/VirtualList.vue'
import PaginationControls from '../components/PaginationControls.vue'
import { fechaParaInput, formatearFecha, parsearFechaLocal, sumarAnos } from '../utils/dates'
import { useFechaActual } from '../composables/useFechaActual'
import ClienteIdentificacion from '../components/ClienteIdentificacion.vue'
import ProximoServicio from '../components/ProximoServicio.vue'
import { etiquetaCliente, coincideDniCuil } from '../utils/clientIdentity'

const { fechaActual } = useFechaActual()

const route = useRoute()
const router = useRouter()

const {
  clientes,
  vehiculos,
  servicios,
  agregarServicio,
  actualizarServicio,
  eliminarServicio,
  obtenerVehiculoPorId,
  obtenerClientePorId,
  formatearTelefonoDisplay
} = useAutoService()

// Memory leak prevention
const { safeInterval, detectLeaks } = useMemoryLeakPrevention()

// Estado del componente
const mostrarFormulario = ref(false)
const servicioEditando = ref(null)
const servicioDetalle = ref(null)
const detalleDialogo = ref(null)
let origenDetalle = null
const verServicio = async (servicio) => {
  origenDetalle = document.activeElement
  servicioDetalle.value = servicio
  await nextTick()
  detalleDialogo.value?.focus()
}
const cerrarDetalle = () => {
  servicioDetalle.value = null
  origenDetalle?.focus()
  origenDetalle = null
}
const filtroVehiculo = ref('')
const filtroCliente = ref('')
const filtroEstado = ref('')
const mostrarConfirmacion = ref(false)
const servicioAEliminar = ref(null)

// 🔧 BÚSQUEDA CORREGIDA - Directo sin debounce
const filtroTexto = ref('')

// Formulario
const formulario = ref({
  vehiculoId: '',
  clienteId: '',
  tipoServicio: '',
  fechaServicio: '',
  estado: 'pendiente',
  costo: '',
  kilometrajeActual: '',
  proximoServicio: '',
  descripcion: '',
  observaciones: ''
})

// Computed optimizado con memoización
const serviciosConRelaciones = useMemoize(() => {
  return servicios.value.map(servicio => ({
    ...servicio,
    vehiculo: obtenerVehiculoPorId(servicio.vehiculoId),
    cliente: obtenerClientePorId(servicio.clienteId)
  }))
}, [servicios, clientes, vehiculos])

const serviciosFiltrados = computed(() => {
  let resultado = serviciosConRelaciones.value

  // 🔍 FILTRO POR TEXTO - EXPANDIDO
  if (filtroTexto.value && filtroTexto.value.trim() !== '') {
    const filtro = filtroTexto.value.toLowerCase().trim()
    resultado = resultado.filter(servicio => 
      servicio.tipoServicio?.toLowerCase().includes(filtro) ||
      servicio.descripcion?.toLowerCase().includes(filtro) ||
      servicio.observaciones?.toLowerCase().includes(filtro) ||
      servicio.vehiculo?.marca?.toLowerCase().includes(filtro) ||
      servicio.vehiculo?.modelo?.toLowerCase().includes(filtro) ||
      servicio.vehiculo?.patente?.toLowerCase().includes(filtro) ||
      servicio.cliente?.nombre?.toLowerCase().includes(filtro) ||
      coincideDniCuil(servicio.cliente?.dniCuil, filtro)
    )
  }

  // Filtro por vehículo
  if (filtroVehiculo.value && filtroVehiculo.value !== '') {
    const vehiculoIdFiltro = parseInt(filtroVehiculo.value)
    resultado = resultado.filter(servicio => 
      servicio.vehiculoId === vehiculoIdFiltro
    )
  }

  // Filtro por cliente
  if (filtroCliente.value && filtroCliente.value !== '') {
    const clienteIdFiltro = parseInt(filtroCliente.value)
    resultado = resultado.filter(servicio => 
      servicio.clienteId === clienteIdFiltro
    )
  }

  // Filtro por estado
  if (filtroEstado.value && filtroEstado.value !== '') {
    resultado = resultado.filter(servicio => 
      servicio.estado === filtroEstado.value
    )
  }

  return resultado.sort((a, b) => parsearFechaLocal(b.fechaServicio) - parsearFechaLocal(a.fechaServicio))
})

// Paginación para cuando no se usa virtual scroll
const {
  currentPage,
  itemsPerPage,
  paginatedItems: paginatedServicios,
  totalPages,
  paginationInfo,
  pageRange,
  goToPage,
  nextPage,
  prevPage,
  firstPage,
  lastPage
} = usePagination(serviciosFiltrados, 20)

// ✅ COMPUTED MEJORADOS
const hayFiltros = computed(() => {
  const filtros = Boolean(
    (filtroTexto.value && filtroTexto.value.trim()) ||
    (filtroVehiculo.value && filtroVehiculo.value !== '') ||
    (filtroCliente.value && filtroCliente.value !== '') ||
    (filtroEstado.value && filtroEstado.value !== '')
  )
  return filtros
})

// 🔧 FUNCIÓN PARA LIMPIAR FILTROS (NUEVA)
const limpiarFiltros = () => {
  console.log('🧹 Limpiando todos los filtros')
  
  filtroTexto.value = ''
  filtroVehiculo.value = ''
  filtroCliente.value = ''
  filtroEstado.value = ''
}

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
    en_progreso: 'En progreso',
    completado: 'Completado',
    cancelado: 'Cancelado'
  }
  return estados[estado] || estado
}

const limpiarFormulario = () => {
  formulario.value = {
    vehiculoId: '',
    clienteId: '',
    tipoServicio: '',
    fechaServicio: '',
    estado: 'pendiente',
    costo: '',
    kilometrajeActual: '',
    proximoServicio: '',
    descripcion: '',
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

// 📅 NUEVA FUNCIÓN: Calcular próximo servicio automáticamente
const calcularProximoServicio = () => {
  // Solo calcular si es "Mantenimiento general" y hay fecha de servicio
  if (formulario.value.tipoServicio === 'Mantenimiento general' && formulario.value.fechaServicio) {
    const proximoServicio = sumarAnos(formulario.value.fechaServicio)
    formulario.value.proximoServicio = proximoServicio
    
    console.log(`📅 Próximo mantenimiento general calculado: ${proximoServicio}`)
  } else if (formulario.value.tipoServicio && formulario.value.tipoServicio !== 'Mantenimiento general') {
    // Si cambia a otro tipo de servicio, limpiar el próximo servicio
    // (excepto si está editando un servicio existente)
    if (!servicioEditando.value) {
      formulario.value.proximoServicio = ''
      console.log('🧹 Próximo servicio limpiado (no es mantenimiento general)')
    }
  }
}

// 🔄 NUEVA FUNCIÓN: Manejar cambios en tipo de servicio
const onTipoServicioChange = () => {
  console.log('🔧 Cambio en tipo de servicio:', formulario.value.tipoServicio)
  calcularProximoServicio()
}

// 📅 NUEVA FUNCIÓN: Manejar cambios en fecha de servicio
const onFechaServicioChange = () => {
  console.log('📅 Cambio en fecha de servicio:', formulario.value.fechaServicio)
  calcularProximoServicio()
}

const editarServicio = (servicio) => {
  servicioEditando.value = servicio
  formulario.value = {
    ...servicio,
    fechaServicio: fechaParaInput(servicio.fechaServicio),
    proximoServicio: servicio.proximoServicio ? fechaParaInput(servicio.proximoServicio) : '',
    costo: servicio.costo || '',
    kilometrajeActual: servicio.kilometrajeActual || '',
    vehiculoId: servicio.vehiculoId.toString(),
    clienteId: servicio.clienteId.toString()
  }
  mostrarFormulario.value = true
}

const guardarServicio = () => {
  const datosServicio = {
    ...formulario.value,
    vehiculoId: parseInt(formulario.value.vehiculoId),
    clienteId: parseInt(formulario.value.clienteId),
    costo: formulario.value.costo ? parseFloat(formulario.value.costo) : 0,
    kilometrajeActual: formulario.value.kilometrajeActual ? parseInt(formulario.value.kilometrajeActual) : 0,
    fechaServicio: formulario.value.fechaServicio,
    proximoServicio: formulario.value.proximoServicio || null
  }

  const resultado = servicioEditando.value
    ? actualizarServicio(servicioEditando.value.id, datosServicio)
    : agregarServicio(datosServicio)
  if (resultado) cancelarFormulario()
}

const cancelarFormulario = () => {
  mostrarFormulario.value = false
  servicioEditando.value = null
  limpiarFormulario()
}

const eliminarServicioConfirm = (servicioId) => {
  servicioAEliminar.value = servicioId
  mostrarConfirmacion.value = true
}

const confirmarEliminarServicio = () => {
  if (servicioAEliminar.value !== null) eliminarServicio(servicioAEliminar.value)
  cancelarEliminarServicio()
}

const cancelarEliminarServicio = () => {
  mostrarConfirmacion.value = false
  servicioAEliminar.value = null
}

// Inicialización
onMounted(() => {
  // Manejar parámetros de URL
  if (route.query.vehiculo) {
    filtroVehiculo.value = route.query.vehiculo
  }
  
  if (route.query.nuevo === 'true' && vehiculos.value.length > 0) {
    if (route.query.vehiculo) {
      formulario.value.vehiculoId = route.query.vehiculo
      onVehiculoChange()
    }
    mostrarFormulario.value = true
  }
  
  // Detectar memory leaks en desarrollo
  if (import.meta.env.DEV) {
    safeInterval(() => {
      const leaks = detectLeaks()
      if (leaks.length > 0) {
        console.warn('[Servicios] Posibles memory leaks:', leaks)
      }
    }, 30000) // Cada 30 segundos
  }
})
</script>
