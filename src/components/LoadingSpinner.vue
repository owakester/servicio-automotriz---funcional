<template>
  <div v-if="show" class="flex items-center justify-center p-8">
    <div class="flex items-center space-x-3">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span class="text-gray-600">{{ message }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: true
  },
  message: {
    type: String,
    default: 'Cargando...'
  }
})
</script>
