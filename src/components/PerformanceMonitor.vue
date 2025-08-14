<template>
  <div 
    v-if="showMonitor"
    class="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-xl z-50 font-mono text-xs"
    style="min-width: 200px"
  >
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-sm font-bold">Performance Monitor</h3>
      <button
        @click="$emit('close')"
        class="text-gray-400 hover:text-white"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
    
    <div class="space-y-1">
      <div class="flex justify-between">
        <span>FPS:</span>
        <span :class="getFPSColor(metrics.fps)">{{ metrics.fps }}</span>
      </div>
      
      <div class="flex justify-between">
        <span>Memory:</span>
        <span>{{ metrics.memoryUsage }} MB</span>
      </div>
      
      <div class="flex justify-between">
        <span>DOM Nodes:</span>
        <span :class="getDOMColor(metrics.domNodes)">{{ metrics.domNodes }}</span>
      </div>
      
      <div class="flex justify-between">
        <span>Listeners:</span>
        <span>{{ metrics.listeners }}</span>
      </div>
      
      <div class="flex justify-between">
        <span>Cache Hit:</span>
        <span>{{ cacheStats.hitRate.toFixed(1) }}%</span>
      </div>
      
      <div class="flex justify-between">
        <span>Storage:</span>
        <span>{{ (cacheStats.totalSize / 1024).toFixed(1) }} KB</span>
      </div>
    </div>
    
    <div class="mt-3 pt-3 border-t border-gray-700">
      <button
        @click="showDetails = !showDetails"
        class="text-xs text-blue-400 hover:text-blue-300"
      >
        {{ showDetails ? 'Hide' : 'Show' }} Details
      </button>
      
      <div v-if="showDetails" class="mt-2 space-y-2">
        <div class="text-xs">
          <p class="text-gray-400">Top Components by Render Time:</p>
          <div 
            v-for="(data, component) in topComponents" 
            :key="component"
            class="flex justify-between mt-1"
          >
            <span class="text-gray-300">{{ component }}:</span>
            <span>{{ data.average.toFixed(2) }}ms</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import { usePerformanceMonitor } from '../composables/usePerformanceMonitor'
import { useSmartCache } from '../composables/useSmartCache'

defineProps({
  showMonitor: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const { metrics, getPerformanceReport } = usePerformanceMonitor()
const { getStats } = useSmartCache()

const showDetails = ref(false)
const cacheStats = ref(getStats())

// Actualizar estadísticas de caché
let interval = null

onMounted(() => {
  interval = setInterval(() => {
    cacheStats.value = getStats()
  }, 2000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
})

// Computed
const topComponents = computed(() => {
  const report = getPerformanceReport()
  return Object.entries(report)
    .sort((a, b) => b[1].average - a[1].average)
    .slice(0, 5)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
})

// Helpers
const getFPSColor = (fps) => {
  if (fps >= 50) return 'text-green-400'
  if (fps >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

const getDOMColor = (nodes) => {
  if (nodes < 1500) return 'text-green-400'
  if (nodes < 3000) return 'text-yellow-400'
  return 'text-red-400'
}
</script>
