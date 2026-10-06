<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="$emit('cancel')"
    @keydown.esc="$emit('cancel')"
  >
    <div
      ref="dialogRef"
      v-focus-trap
      class="bg-white rounded-lg p-6 w-full max-w-md mx-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      tabindex="-1"
    >
      <div class="flex items-center mb-4">
        <AlertTriangle class="h-6 w-6 text-orange-500 mr-3" aria-hidden="true" />
        <h3 id="confirm-dialog-title" class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      </div>
      
      <p id="confirm-dialog-message" class="text-gray-600 mb-6">{{ message }}</p>
      
      <div class="flex justify-end space-x-3">
        <button
          ref="cancelButtonRef"
          type="button"
          @click="$emit('cancel')"
          class="btn-secondary"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          @click="$emit('confirm')"
          :class="[
            'px-4 py-2 rounded-lg transition-colors duration-200 font-medium',
            type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'
          ]"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirmar acción'
  },
  message: {
    type: String,
    default: '¿Estás seguro de que deseas realizar esta acción?'
  },
  confirmText: {
    type: String,
    default: 'Confirmar'
  },
  cancelText: {
    type: String,
    default: 'Cancelar'
  },
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'danger'].includes(value)
  }
})

defineEmits(['confirm', 'cancel'])

const dialogRef = ref(null)
const cancelButtonRef = ref(null)
let previouslyFocused = null

watch(
  () => props.show,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement
      await nextTick()
      cancelButtonRef.value?.focus()
    } else if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus()
      previouslyFocused = null
    }
  }
)

onBeforeUnmount(() => {
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
})
</script>
