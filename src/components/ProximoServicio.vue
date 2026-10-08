<template>
  <span v-if="campo === 'fecha'">
    {{ servicio.proximoServicio ? formatearFecha(servicio.proximoServicio) || 'Fecha inválida' : 'No programado' }}
    <small v-if="estado === 'reemplazado'" class="block text-gray-500">Fecha histórica</small>
  </span>
  <span v-else-if="estado === 'vigente' && dias !== null" :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', color]">
    {{ textoDias }}
  </span>
  <span v-else class="inline-block max-w-[12rem] whitespace-normal text-xs text-gray-500">
    {{ etiquetas[estado] || '-' }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useAutoService } from '../composables/useAutoService'
import { useFechaActual } from '../composables/useFechaActual'
import { diasHastaFecha, formatearFecha } from '../utils/dates'

const props = defineProps({ servicio: { type: Object, required: true }, campo: { type: String, default: 'fecha' } })
const { obtenerEstadoRecordatorio } = useAutoService()
const { fechaActual } = useFechaActual()
const estado = computed(() => obtenerEstadoRecordatorio(props.servicio))
const dias = computed(() => diasHastaFecha(props.servicio.proximoServicio, fechaActual.value))
const color = computed(() => dias.value < 0 ? 'bg-red-100 text-red-900' : dias.value <= 7 ? 'bg-orange-100 text-orange-900' : dias.value <= 30 ? 'bg-yellow-100 text-yellow-900' : 'bg-green-100 text-green-900')
const textoDias = computed(() => dias.value < 0 ? `${Math.abs(dias.value)} días vencido` : dias.value === 0 ? 'Hoy' : dias.value === 1 ? 'Mañana' : `${dias.value} días`)
const etiquetas = {
  reemplazado: 'Recordatorio reemplazado por un mantenimiento posterior',
  pendiente: 'Se activa al completar el servicio',
  cancelado: 'Sin recordatorio (cancelado)',
  invalido: 'Fecha inválida',
  sin_fecha: '-'
}
</script>
