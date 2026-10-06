<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <div class="text-sm text-gray-500">
        {{ new Date().toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) }}
      </div>
    </div>

    <section v-if="sinDatos" class="card border border-primary-100" aria-labelledby="primeros-pasos-title">
      <div class="max-w-3xl">
        <p class="text-sm font-semibold text-primary-700 mb-1">Primeros pasos</p>
        <h2 id="primeros-pasos-title" class="text-2xl font-bold text-gray-900 mb-2">Prepará el taller en pocos minutos</h2>
        <p class="text-gray-600 mb-6">Empezá por el cliente, asociá su vehículo y luego creá una orden de trabajo.</p>
        <ol class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <li class="rounded-lg border border-gray-200 p-4">
            <span class="text-xs font-semibold text-primary-700">PASO 1</span>
            <h3 class="font-semibold text-gray-900 mt-1">Registrar cliente</h3>
            <p class="text-sm text-gray-600 mt-1 mb-4">Guardá sus datos de contacto.</p>
            <router-link to="/clientes" class="btn-primary inline-flex">Ir a Clientes</router-link>
          </li>
          <li class="rounded-lg border border-gray-200 p-4">
            <span class="text-xs font-semibold text-gray-500">PASO 2</span>
            <h3 class="font-semibold text-gray-900 mt-1">Agregar vehículo</h3>
            <p class="text-sm text-gray-600 mt-1">Asocialo al cliente para conservar su historial.</p>
          </li>
          <li class="rounded-lg border border-gray-200 p-4">
            <span class="text-xs font-semibold text-gray-500">PASO 3</span>
            <h3 class="font-semibold text-gray-900 mt-1">Crear orden</h3>
            <p class="text-sm text-gray-600 mt-1">Registrá el trabajo, prioridad y presupuesto.</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Estadísticas -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <div class="card">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Users class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Clientes</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.totalClientes }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <Car class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Vehículos</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.totalVehiculos }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-lg">
            <Wrench class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Servicios Este Mes</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.serviciosEstesMes }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-3 bg-indigo-100 rounded-lg">
            <ClipboardList class="h-6 w-6 text-indigo-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Órdenes Pendientes</p>
            <p class="text-2xl font-bold text-gray-900">{{ estadisticas.ordenesPendientes }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-100 rounded-lg">
            <AlertTriangle class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Alertas Totales</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ estadisticas.alertasVencidas + estadisticas.alertasUrgentes + estadisticas.ordenesVencidas }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Alertas -->
    <div v-if="!sinDatos" class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Servicios Vencidos -->
      <div class="card">
        <h3 class="text-lg font-semibold text-red-600 mb-4 flex items-center">
          <AlertCircle class="h-5 w-5 mr-2" />
          Servicios Vencidos ({{ estadisticas.alertasVencidas }})
        </h3>
        <div class="space-y-3">
          <div 
            v-for="vehiculo in vehiculosVencidos" 
            :key="vehiculo.id"
            class="p-3 bg-red-50 rounded-lg border border-red-200"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-red-900">{{ vehiculo.marca }} {{ vehiculo.modelo }}</p>
                <p class="text-sm text-red-600">Patente: {{ vehiculo.patente }}</p>
                <p class="text-sm text-red-600">Cliente: {{ vehiculo.cliente?.nombre }}</p>
              </div>
              <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                {{ vehiculo.alerta.dias }} días vencido
              </span>
            </div>
          </div>
          <div v-if="vehiculosVencidos.length === 0" class="text-center text-gray-500 py-4">
            No hay servicios vencidos
          </div>
        </div>
      </div>

      <!-- Servicios Urgentes -->
      <div class="card">
        <h3 class="text-lg font-semibold text-orange-600 mb-4 flex items-center">
          <Clock class="h-5 w-5 mr-2" />
          Servicios Urgentes ({{ estadisticas.alertasUrgentes }})
        </h3>
        <div class="space-y-3">
          <div 
            v-for="vehiculo in vehiculosUrgentes" 
            :key="vehiculo.id"
            class="p-3 bg-orange-50 rounded-lg border border-orange-200"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-orange-900">{{ vehiculo.marca }} {{ vehiculo.modelo }}</p>
                <p class="text-sm text-orange-600">Patente: {{ vehiculo.patente }}</p>
                <p class="text-sm text-orange-600">Cliente: {{ vehiculo.cliente?.nombre }}</p>
              </div>
              <span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                {{ vehiculo.alerta.dias }} días
              </span>
            </div>
          </div>
          <div v-if="vehiculosUrgentes.length === 0" class="text-center text-gray-500 py-4">
            No hay servicios urgentes
          </div>
        </div>
      </div>

      <!-- Órdenes Vencidas -->
      <div class="card">
        <h3 class="text-lg font-semibold text-red-600 mb-4 flex items-center">
          <ClipboardList class="h-5 w-5 mr-2" />
          Órdenes Vencidas ({{ estadisticas.ordenesVencidas }})
        </h3>
        <div class="space-y-3">
          <div 
            v-for="orden in ordenesVencidas" 
            :key="orden.id"
            class="p-3 bg-red-50 rounded-lg border border-red-200"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-red-900">{{ orden.numeroOrden }}</p>
                <p class="text-sm text-red-600">{{ orden.vehiculo?.marca }} {{ orden.vehiculo?.modelo }}</p>
                <p class="text-sm text-red-600">{{ orden.cliente?.nombre }}</p>
              </div>
              <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Vencida
              </span>
            </div>
          </div>
          <div v-if="ordenesVencidas.length === 0" class="text-center text-gray-500 py-4">
            No hay órdenes vencidas
          </div>
        </div>
      </div>

      <!-- Servicios Próximos -->
      <div class="card">
        <h3 class="text-lg font-semibold text-yellow-600 mb-4 flex items-center">
          <Calendar class="h-5 w-5 mr-2" />
          Servicios Próximos ({{ estadisticas.alertasProximas }})
        </h3>
        <div class="space-y-3">
          <div 
            v-for="vehiculo in vehiculosProximos" 
            :key="vehiculo.id"
            class="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-yellow-900">{{ vehiculo.marca }} {{ vehiculo.modelo }}</p>
                <p class="text-sm text-yellow-600">Patente: {{ vehiculo.patente }}</p>
                <p class="text-sm text-yellow-600">Cliente: {{ vehiculo.cliente?.nombre }}</p>
              </div>
              <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {{ vehiculo.alerta.dias }} días
              </span>
            </div>
          </div>
          <div v-if="vehiculosProximos.length === 0" class="text-center text-gray-500 py-4">
            No hay servicios próximos
          </div>
        </div>
      </div>
    </div>

    <!-- Servicios Recientes -->
    <div v-if="!sinDatos" class="card">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Servicios Recientes</h3>
      <div class="overflow-x-auto">
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
                Costo
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="servicio in serviciosRecientes" :key="servicio.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ servicio.vehiculo?.marca }} {{ servicio.vehiculo?.modelo }}
                </div>
                <div class="text-sm text-gray-500">{{ servicio.vehiculo?.patente }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ servicio.cliente?.nombre }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ servicio.tipoServicio }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatearFecha(servicio.fechaServicio) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ servicio.proximoServicio ? formatearFecha(servicio.proximoServicio) : 'No programado' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="servicio.proximoServicio" :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  calcularDiasRestantes(servicio.proximoServicio) < 0 ? 'bg-red-100 text-red-900' :
                  calcularDiasRestantes(servicio.proximoServicio) <= 7 ? 'bg-orange-100 text-orange-900' :
                  calcularDiasRestantes(servicio.proximoServicio) <= 30 ? 'bg-yellow-100 text-yellow-900' :
                  'bg-green-100 text-green-900'
                ]">
                  {{ formatearDiasRestantes(servicio.proximoServicio) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${{ servicio.costo?.toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="serviciosRecientes.length === 0" class="text-center text-gray-500 py-8">
          No hay servicios registrados
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { 
  Users, 
  Car, 
  Wrench, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Calendar,
  ClipboardList
} from 'lucide-vue-next'
import { useAutoService } from '../composables/useAutoService'
import { useOrdenes } from '../composables/useOrdenes'
import { useMemoize } from '../composables/useOptimization'
import { usePerformanceMonitor } from '../composables/usePerformanceMonitor'
import { useSmartCache } from '../composables/useSmartCache'

const { 
  vehiculosConAlertas, 
  estadisticas, 
  servicios, 
  obtenerVehiculoPorId, 
  obtenerClientePorId 
} = useAutoService()

const sinDatos = computed(() =>
  estadisticas.value.totalClientes === 0 &&
  estadisticas.value.totalVehiculos === 0 &&
  estadisticas.value.totalServicios === 0 &&
  estadisticas.value.totalOrdenes === 0
)

const { ordenesVencidas } = useOrdenes()
const { measureComponentRender, detectExcessiveRerenders } = usePerformanceMonitor()
const { getOrFetch } = useSmartCache()

// FUNCIONES PARA CORREGIR EL PROBLEMA DE FECHAS
const formatearFecha = (fecha) => {
  if (!fecha) return ''
  
  // Crear fecha local para evitar problema de zona horaria
  const fechaLocal = new Date(fecha + 'T00:00:00')
  
  return fechaLocal.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const calcularDiasRestantes = (fechaProximoServicio) => {
  if (!fechaProximoServicio) return null
  
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0) // Resetear horas para comparación exacta
  
  const fechaServicio = new Date(fechaProximoServicio + 'T00:00:00')
  
  const diferenciaTiempo = fechaServicio.getTime() - hoy.getTime()
  const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24))
  
  return diferenciaDias
}

const formatearDiasRestantes = (fechaProximoServicio) => {
  const dias = calcularDiasRestantes(fechaProximoServicio)
  
  if (dias === null) return '-'
  
  if (dias < 0) {
    return `${Math.abs(dias)} días vencido`
  } else if (dias === 0) {
    return 'Hoy'
  } else if (dias === 1) {
    return 'Mañana'
  } else {
    return `${dias} días`
  }
}

// Medir renders del dashboard
const checkRerenders = detectExcessiveRerenders('Dashboard', 5)
onMounted(() => {
  const endMeasure = measureComponentRender('Dashboard')
  onUnmounted(() => {
    endMeasure()
  })
})

// Computed optimizados con memoización
const vehiculosVencidos = useMemoize(
  () => vehiculosConAlertas.value.filter(v => v.alerta?.tipo === 'vencido'),
  [vehiculosConAlertas]
)

const vehiculosUrgentes = useMemoize(
  () => vehiculosConAlertas.value.filter(v => v.alerta?.tipo === 'urgente'),
  [vehiculosConAlertas]
)

const vehiculosProximos = useMemoize(
  () => vehiculosConAlertas.value.filter(v => v.alerta?.tipo === 'proximo'),
  [vehiculosConAlertas]
)

// Computed para servicios recientes con caché
const serviciosRecientes = useMemoize(() => {
  checkRerenders() // Verificar re-renders
  
  return [...servicios.value]
    .sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))
    .slice(0, 5)
    .map(servicio => ({
      ...servicio,
      vehiculo: obtenerVehiculoPorId(servicio.vehiculoId),
      cliente: obtenerClientePorId(servicio.clienteId)
    }))
}, [servicios])
</script>
