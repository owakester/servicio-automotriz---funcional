<template>
  <div
    ref="container"
    :class="containerClass"
    :style="containerStyle"
  >
    <!-- Placeholder mientras carga -->
    <div
      v-if="!loaded && !error"
      class="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
    >
      <ImageIcon class="h-8 w-8 text-gray-400" />
    </div>
    
    <!-- Imagen -->
    <img
      v-show="loaded && !error"
      ref="image"
      :src="currentSrc"
      :alt="alt"
      :class="imageClass"
      @load="onLoad"
      @error="onError"
      loading="lazy"
    />
    
    <!-- Error state -->
    <div
      v-if="error"
      class="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center"
    >
      <AlertCircle class="h-8 w-8 text-gray-400 mb-2" />
      <span class="text-sm text-gray-500">Error al cargar imagen</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { ImageIcon, AlertCircle } from 'lucide-vue-next'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  width: {
    type: [Number, String],
    default: null
  },
  height: {
    type: [Number, String],
    default: null
  },
  placeholder: {
    type: String,
    default: null
  },
  aspectRatio: {
    type: String,
    default: null // '16/9', '4/3', '1/1', etc.
  },
  objectFit: {
    type: String,
    default: 'cover' // cover, contain, fill, none, scale-down
  },
  lazy: {
    type: Boolean,
    default: true
  },
  threshold: {
    type: Number,
    default: 0.1
  },
  rootMargin: {
    type: String,
    default: '50px'
  },
  quality: {
    type: Number,
    default: 85
  }
})

const emit = defineEmits(['load', 'error'])

// Estado
const container = ref(null)
const image = ref(null)
const loaded = ref(false)
const error = ref(false)
const isIntersecting = ref(false)
const currentSrc = ref('')

let observer = null

// Computed styles
const containerClass = computed(() => [
  'relative overflow-hidden',
  props.aspectRatio && 'aspect-ratio-container'
])

const containerStyle = computed(() => {
  const styles = {}
  
  if (props.width) {
    styles.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  if (props.aspectRatio) {
    styles.aspectRatio = props.aspectRatio
  }
  
  return styles
})

const imageClass = computed(() => [
  'w-full h-full',
  `object-${props.objectFit}`,
  'transition-opacity duration-300',
  loaded.value ? 'opacity-100' : 'opacity-0'
])

// Métodos
const loadImage = () => {
  if (!props.src) return
  
  // Si no es lazy loading o ya está intersectando, cargar inmediatamente
  if (!props.lazy || isIntersecting.value) {
    currentSrc.value = props.src
  }
}

const onLoad = () => {
  loaded.value = true
  error.value = false
  emit('load')
}

const onError = () => {
  loaded.value = false
  error.value = true
  emit('error')
}

const handleIntersection = (entries) => {
  const entry = entries[0]
  if (entry.isIntersecting && !isIntersecting.value) {
    isIntersecting.value = true
    loadImage()
    
    // Desconectar observer después de cargar
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }
}

// Lifecycle
onMounted(() => {
  if (props.lazy && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(handleIntersection, {
      threshold: props.threshold,
      rootMargin: props.rootMargin
    })
    
    if (container.value) {
      observer.observe(container.value)
    }
  } else {
    // Si no hay soporte para IntersectionObserver o no es lazy, cargar inmediatamente
    loadImage()
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

// Watch para cambios en src
watch(() => props.src, (newSrc) => {
  if (newSrc && (!props.lazy || isIntersecting.value)) {
    loaded.value = false
    error.value = false
    currentSrc.value = newSrc
  }
})
</script>

<style scoped>
/* Fallback para navegadores que no soportan aspect-ratio */
@supports not (aspect-ratio: 1) {
  .aspect-ratio-container::before {
    content: "";
    display: block;
    padding-top: var(--aspect-ratio-padding, 56.25%); /* 16:9 por defecto */
  }
  
  .aspect-ratio-container > * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
