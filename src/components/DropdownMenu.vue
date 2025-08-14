<template>
  <div class="relative inline-block">
    <button
      @click="toggleDropdown"
      :class="[
        'btn-secondary flex items-center space-x-2',
        { 'bg-gray-700': isOpen }
      ]"
    >
      <component :is="icon" class="h-4 w-4" />
      <span>{{ label }}</span>
      <ChevronDown :class="['h-4 w-4 transition-transform', { 'rotate-180': isOpen }]" />
    </button>
    
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
    >
      <div class="py-1">
        <button
          v-for="action in actions"
          :key="action.label"
          @click="handleAction(action)"
          :class="[
            'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center space-x-2',
            action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
          ]"
        >
          <component :is="action.icon" class="h-4 w-4" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  icon: {
    type: Object,
    required: true
  },
  actions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['action'])

const isOpen = ref(false)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const handleAction = (action) => {
  emit('action', action)
  isOpen.value = false
}

const closeDropdown = (event) => {
  if (!event.target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>
