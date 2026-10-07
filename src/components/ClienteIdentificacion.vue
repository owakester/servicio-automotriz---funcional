<template>
  <span class="block">
    <span>{{ cliente?.nombre || alternativa }}</span>
    <span v-if="cliente?.dniCuil" class="block text-xs text-gray-600 break-words">
      DNI/CUIL: {{ formatearDniCuil(cliente.dniCuil) }}
    </span>
  </span>
</template>

<script setup>
import { formatearDniCuil } from '../utils/clientIdentity'

defineProps({
  cliente: { type: Object, default: null },
  alternativa: { type: String, default: 'Sin cliente' }
})
</script>
