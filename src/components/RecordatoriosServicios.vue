<template>
  <button
    ref="botonCampana"
    type="button"
    class="ml-3 relative p-2 rounded-md text-gray-600 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
    :aria-label="`Recordatorios de servicios: ${recordatorios.length} ${recordatorios.length === 1 ? 'pendiente' : 'pendientes'}`"
    title="Recordatorios de servicios"
    :disabled="!datosListos"
    @click="abrirRecordatorios"
  >
    <Bell class="h-5 w-5" aria-hidden="true" />
    <span v-if="recordatorios.length" class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs px-1 min-w-[1.25rem]">
      {{ recordatorios.length }}
    </span>
  </button>

  <Teleport to="body">
    <div v-if="panelAbierto" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="cerrarRecordatorios" @keydown.esc="cerrarRecordatorios">
      <section v-focus-trap class="bg-white rounded-lg shadow-xl p-5 w-full max-w-2xl max-h-[90dvh] overflow-y-auto"
        role="dialog" aria-modal="true" aria-labelledby="service-reminders-title" tabindex="-1">
        <div class="flex items-start justify-between gap-4">
          <h2 id="service-reminders-title" class="text-xl font-bold text-gray-900">Recordatorios de servicios</h2>
          <button ref="botonCerrar" type="button" class="p-2 rounded-md text-gray-600 hover:bg-gray-100" aria-label="Cerrar recordatorios" @click="cerrarRecordatorios">
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-600">Próximos mantenimientos de vehículos: vencidos, para hoy y dentro de 7 días. No son vencimientos de órdenes de trabajo.</p>
        <p v-if="recordatorios.length" class="mt-3 text-sm font-medium text-gray-900">
          {{ resumen.vencidos }} vencidos · {{ resumen.hoy }} para hoy · {{ resumen.proximos }} {{ resumen.proximos === 1 ? 'próximo' : 'próximos' }}
        </p>
        <p v-else class="my-6 text-gray-600">No hay servicios vencidos ni por vencer en los próximos 7 días.</p>
        <ul class="mt-4 space-y-3">
          <li v-for="vehiculo in recordatorios" :key="vehiculo.id" class="border rounded-lg p-4">
            <div class="flex flex-wrap justify-between items-start gap-2">
              <div>
                <p class="font-semibold text-gray-900">{{ vehiculo.patente }} · {{ vehiculo.marca }} {{ vehiculo.modelo }}</p>
                <ClienteIdentificacion :cliente="vehiculo.cliente" class="text-sm text-gray-700" />
                <p class="mt-1 text-sm text-gray-600">Próximo servicio: {{ formatearFecha(vehiculo.ultimoServicio.proximoServicio) }}</p>
              </div>
              <span :class="['text-sm font-medium', vehiculo.diasRestantes < 0 ? 'text-red-700' : 'text-orange-700']">
                {{ textoVencimiento(vehiculo.diasRestantes) }}
              </span>
            </div>
            <router-link :to="{ path: '/vehiculos', query: { cliente: vehiculo.clienteId } }" class="mt-3 inline-block text-sm font-medium text-primary-700 underline" @click="cerrarRecordatorios">
              Ver vehículos del cliente
            </router-link>
          </li>
        </ul>
        <label class="mt-5 flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" class="mt-1" :checked="recordatoriosActivados" @change="configurarRecordatorios($event.target.checked)" />
          Mostrar un resumen diario al abrir el programa o cambiar el día
        </label>
        <p class="mt-2 text-xs text-gray-500">Los avisos funcionan mientras el programa está abierto. Esta lista siempre está disponible desde la campana; no se envían mensajes automáticamente.</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bell, X } from 'lucide-vue-next'
import ClienteIdentificacion from './ClienteIdentificacion.vue'
import { useRecordatoriosServicios } from '../composables/useRecordatoriosServicios'
import { formatearFecha } from '../utils/dates'

const {
  datosListos, fechaActual, recordatorios, resumen, panelAbierto, recordatoriosActivados,
  mostrarResumenDiario, configurarRecordatorios, abrirRecordatorios, cerrarRecordatorios
} = useRecordatoriosServicios()
const botonCerrar = ref(null)
const botonCampana = ref(null)
let focoAnterior = null

watch([datosListos, fechaActual, recordatorios], mostrarResumenDiario, { immediate: true })
watch(panelAbierto, async (abierto) => {
  if (abierto) {
    focoAnterior = document.activeElement
    await nextTick()
    botonCerrar.value?.focus()
  } else {
    if (focoAnterior?.isConnected && focoAnterior !== document.body) focoAnterior.focus?.()
    else botonCampana.value?.focus()
    focoAnterior = null
  }
})
onMounted(() => document.addEventListener('visibilitychange', mostrarResumenDiario))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', mostrarResumenDiario)
  focoAnterior?.focus?.()
})

const textoVencimiento = (dias) => {
  const plazo = `${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
  return dias < 0 ? `Vencido hace ${plazo}` : dias === 0 ? 'Vence hoy' : `Vence en ${plazo}`
}
</script>
