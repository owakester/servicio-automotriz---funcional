<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900">Reportes</h1>
      <div v-if="hayDatos" class="flex flex-wrap gap-2">
        <button
          @click="exportarServicios(filtros.fechaInicio, filtros.fechaFin)"
          class="btn-secondary flex items-center"
        >
          <Download class="h-4 w-4 mr-2" />
          Exportar Servicios
        </button>
        <button
          @click="exportarClientes()"
          class="btn-secondary flex items-center"
        >
          <Download class="h-4 w-4 mr-2" />
          Exportar Clientes
        </button>
      </div>
    </div>

    <div v-if="!hayDatos" class="card text-center py-12">
      <BarChart3 class="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Todavía no hay datos para reportar</h2>
      <p class="text-gray-500 mb-6">Los reportes aparecerán cuando registres clientes, vehículos y servicios.</p>
      <router-link to="/clientes" class="btn-primary inline-flex">Comenzar por Clientes</router-link>
    </div>

    <!-- Filtros de Fecha -->
    <BaseCard v-if="hayDatos" title="Filtros de Período">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="report-start-date" class="block text-sm font-medium text-gray-700 mb-1">
            Fecha Inicio
          </label>
          <input
            v-model="filtros.fechaInicio"
            id="report-start-date"
            type="date"
            class="input-field"
          />
        </div>
        <div>
          <label for="report-end-date" class="block text-sm font-medium text-gray-700 mb-1">
            Fecha Fin
          </label>
          <input
            v-model="filtros.fechaFin"
            id="report-end-date"
            type="date"
            class="input-field"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="aplicarFiltros"
            class="btn-primary w-full"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Estadísticas del Período -->
    <BaseCard title="Resumen del Período" v-if="hayDatos && datosPeriodo">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-primary-600">
            {{ datosPeriodo.cantidadServicios }}
          </div>
          <div class="text-sm text-gray-600">Servicios Realizados</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">
            ${{ datosPeriodo.totalIngresos.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-600">Total de trabajos realizados</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">
            ${{ promedioServicio.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-600">Promedio por Servicio</div>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-purple-600">
            {{ Object.keys(datosPeriodo.ingresosPorTipo).length }}
          </div>
          <div class="text-sm text-gray-600">Tipos de Servicio</div>
        </div>
      </div>
    </BaseCard>

    <!-- Ingresos por Tipo de Servicio -->
    <p v-if="hayDatos" class="text-sm text-gray-600">Los importes incluyen solo servicios completados. No representan cobros registrados. El listado anual de servicios incluye todos los estados.</p>
    <BaseCard title="Trabajos realizados por Tipo de Servicio" v-if="hayDatos && datosPeriodo && datosPeriodo.cantidadServicios > 0">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-gray-50">
            <tr>
              <th>Tipo de Servicio</th>
              <th>Cantidad</th>
              <th>Importe de trabajos realizados</th>
              <th>Promedio</th>
              <th>% del Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(datos, tipo) in datosPeriodo.ingresosPorTipo" :key="tipo">
              <td class="font-medium">{{ tipo }}</td>
              <td>{{ datos.cantidad }}</td>
              <td>${{ datos.total.toLocaleString() }}</td>
              <td>${{ (datos.total / datos.cantidad).toFixed(0) }}</td>
              <td>{{ (datosPeriodo.totalIngresos > 0 ? (datos.total / datosPeriodo.totalIngresos) * 100 : 0).toFixed(1) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Clientes Más Frecuentes -->
    <BaseCard v-if="clientesFrecuentes.length > 0" title="Top 10 Clientes Más Frecuentes">
      <div class="overflow-x-auto">
        <table class="table">
          <thead class="bg-gray-50">
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Servicios completados</th>
              <th>Total de trabajos realizados</th>
              <th>Último Servicio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cliente in clientesFrecuentes" :key="cliente.id">
              <td class="font-medium">{{ cliente.nombre }}</td>
              <td>{{ cliente.email }}</td>
              <td>{{ cliente.cantidadServicios }}</td>
              <td>${{ cliente.totalGastado.toLocaleString() }}</td>
              <td>
                {{ cliente.ultimoServicio 
                  ? formatearFecha(cliente.ultimoServicio.fechaServicio)
                  : 'N/A' 
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Vehículos por Marca/Modelo -->
    <BaseCard v-if="vehiculosPorMarca.length > 0" title="Vehículos por Marca y Modelo">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="grupo in vehiculosPorMarca"
          :key="`${grupo.marca}-${grupo.modelo}`"
          class="bg-gray-50 p-4 rounded-lg"
        >
          <div class="font-semibold text-gray-900">
            {{ grupo.marca }} {{ grupo.modelo }}
          </div>
          <div class="text-2xl font-bold text-primary-600">
            {{ grupo.cantidad }}
          </div>
          <div class="text-sm text-gray-600">
            {{ grupo.cantidad === 1 ? 'vehículo' : 'vehículos' }}
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Estadísticas Anuales -->
    <BaseCard v-if="servicios.length > 0" title="Estadísticas del Año Actual">
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Gráfico de Servicios por Mes -->
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Servicios por Mes</h4>
            <div class="space-y-2">
              <div
                v-for="stat in estadisticasAnuales"
                :key="stat.mes"
                class="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span class="font-medium">{{ stat.mes }}</span>
                <div class="flex items-center space-x-2">
                  <div
                    class="bg-primary-600 h-4 rounded"
                    :style="{ width: `${(stat.cantidadServicios / maxServicios) * 100}px` }"
                  ></div>
                  <span class="text-sm font-semibold w-8">{{ stat.cantidadServicios }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Gráfico de Ingresos por Mes -->
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Trabajos realizados por Mes</h4>
            <div class="space-y-2">
              <div
                v-for="stat in estadisticasAnuales"
                :key="`ingresos-${stat.mes}`"
                class="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span class="font-medium">{{ stat.mes }}</span>
                <div class="flex items-center space-x-2">
                  <div
                    class="bg-green-600 h-4 rounded"
                    :style="{ width: `${(stat.ingresos / maxIngresos) * 100}px` }"
                  ></div>
                  <span class="text-sm font-semibold w-16">${{ stat.ingresos.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { BarChart3, Download } from 'lucide-vue-next'
import BaseCard from '../components/BaseCard.vue'
import { useReports } from '../composables/useReports'
import { useAutoService } from '../composables/useAutoService'
import { fechaParaInput, formatearFecha } from '../utils/dates'

const {
  getIngresosPorPeriodo,
  getClientesFrecuentes,
  getVehiculosPorMarca,
  getEstadisticasAnuales,
  exportarServicios,
  exportarClientes
} = useReports()
const { clientes, vehiculos, servicios } = useAutoService()

// Estado
const filtros = ref({
  fechaInicio: '',
  fechaFin: ''
})

const datosPeriodo = ref(null)
const hayDatos = computed(() => clientes.value.length > 0 || vehiculos.value.length > 0 || servicios.value.length > 0)

// Computed
const clientesFrecuentes = computed(() => getClientesFrecuentes(10))
const vehiculosPorMarca = computed(() => getVehiculosPorMarca())
const estadisticasAnuales = computed(() => getEstadisticasAnuales())

const promedioServicio = computed(() => {
  if (!datosPeriodo.value || datosPeriodo.value.cantidadServicios === 0) return 0
  return Math.round(datosPeriodo.value.totalIngresos / datosPeriodo.value.cantidadServicios)
})

const maxServicios = computed(() => {
  return Math.max(...estadisticasAnuales.value.map(s => s.cantidadServicios), 1)
})

const maxIngresos = computed(() => {
  return Math.max(...estadisticasAnuales.value.map(s => s.ingresos), 1)
})

// Funciones
const aplicarFiltros = () => {
  if (filtros.value.fechaInicio && filtros.value.fechaFin) {
    datosPeriodo.value = getIngresosPorPeriodo(filtros.value.fechaInicio, filtros.value.fechaFin)
  }
}

const inicializarFiltros = () => {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  
  filtros.value.fechaInicio = fechaParaInput(inicioMes)
  filtros.value.fechaFin = fechaParaInput(hoy)
  
  aplicarFiltros()
}

onMounted(() => {
  inicializarFiltros()
})
</script>
