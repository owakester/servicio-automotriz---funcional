<template>
  <div 
    ref="container"
    class="virtual-list-container"
    :style="{ height: containerHeight, overflow: 'auto' }"
    @scroll="handleScroll"
  >
    <!-- Spacer para mantener el scroll correcto -->
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <!-- Items visibles -->
      <div
        v-for="{ item, index, style } in visibleItems"
        :key="getItemKey(item, index)"
        :style="style"
        class="virtual-list-item"
      >
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useThrottle } from '../composables/useOptimization'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 50
  },
  containerHeight: {
    type: String,
    default: '400px'
  },
  buffer: {
    type: Number,
    default: 5
  },
  keyField: {
    type: String,
    default: 'id'
  }
})

const container = ref(null)
const scrollTop = ref(0)
const containerHeightPx = ref(400)

// Calcular altura total
const totalHeight = computed(() => props.items.length * props.itemHeight)

// Calcular items visibles
const visibleCount = computed(() => 
  Math.ceil(containerHeightPx.value / props.itemHeight) + props.buffer * 2
)

const startIndex = computed(() => 
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
)

const endIndex = computed(() => 
  Math.min(props.items.length, startIndex.value + visibleCount.value)
)

const visibleItems = computed(() => {
  const items = []
  
  for (let i = startIndex.value; i < endIndex.value; i++) {
    items.push({
      item: props.items[i],
      index: i,
      style: {
        position: 'absolute',
        top: `${i * props.itemHeight}px`,
        left: 0,
        right: 0,
        height: `${props.itemHeight}px`
      }
    })
  }
  
  return items
})

// Throttle scroll handler
const handleScroll = useThrottle((event) => {
  scrollTop.value = event.target.scrollTop
}, 16) // ~60fps

// Obtener key para el item
const getItemKey = (item, index) => {
  if (props.keyField && item[props.keyField] !== undefined) {
    return item[props.keyField]
  }
  return index
}

// Actualizar altura del contenedor
const updateContainerHeight = () => {
  if (container.value) {
    containerHeightPx.value = container.value.clientHeight
  }
}

// Observar cambios de tamaño
let resizeObserver
onMounted(() => {
  updateContainerHeight()
  
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(updateContainerHeight)
    if (container.value) {
      resizeObserver.observe(container.value)
    }
  }
})

onUnmounted(() => {
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value)
    resizeObserver.disconnect()
  }
})

// Métodos públicos
const scrollToIndex = (index) => {
  if (container.value) {
    container.value.scrollTop = index * props.itemHeight
  }
}

const scrollToTop = () => {
  if (container.value) {
    container.value.scrollTop = 0
  }
}

const scrollToBottom = () => {
  if (container.value) {
    container.value.scrollTop = totalHeight.value
  }
}

defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom
})
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-list-item {
  box-sizing: border-box;
}

/* Scrollbar personalizado */
.virtual-list-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
