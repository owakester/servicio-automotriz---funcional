import { customRef, computed, shallowRef, triggerRef } from 'vue'

// Hook para memoizar valores computados costosos
export const useMemoize = (fn, deps = []) => {
  const cache = new Map()
  
  return computed(() => {
    const key = JSON.stringify(deps.map(dep => dep.value))
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn()
    cache.set(key, result)
    
    // Limpiar cache cuando sea muy grande
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    return result
  })
}

// Hook para debounce
export const useDebounce = (value, delay = 300) => {
  let timeout
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value.value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value.value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

// Hook para throttle
export const useThrottle = (fn, delay = 300) => {
  let lastCall = 0
  let timeout
  
  return (...args) => {
    const now = Date.now()
    
    if (now - lastCall >= delay) {
      lastCall = now
      return fn(...args)
    } else {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        lastCall = Date.now()
        fn(...args)
      }, delay - (now - lastCall))
    }
  }
}

// Hook para lazy loading de datos grandes
export const useLazyData = (loader, options = {}) => {
  const { 
    cache = true,
    cacheTime = 5 * 60 * 1000, // 5 minutos
    retryCount = 3,
    retryDelay = 1000
  } = options
  
  const data = shallowRef(null)
  const loading = shallowRef(false)
  const error = shallowRef(null)
  const lastFetch = shallowRef(null)
  
  const load = async (force = false) => {
    // Si ya está cargando, no hacer nada
    if (loading.value) return
    
    // Si hay cache válido y no se fuerza, usar cache
    if (cache && !force && data.value && lastFetch.value) {
      const cacheAge = Date.now() - lastFetch.value
      if (cacheAge < cacheTime) {
        return data.value
      }
    }
    
    loading.value = true
    error.value = null
    
    let attempts = 0
    while (attempts < retryCount) {
      try {
        const result = await loader()
        data.value = result
        lastFetch.value = Date.now()
        triggerRef(data)
        loading.value = false
        return result
      } catch (err) {
        attempts++
        if (attempts >= retryCount) {
          error.value = err
          loading.value = false
          throw err
        }
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
      }
    }
  }
  
  // Limpiar cache
  const clearCache = () => {
    data.value = null
    lastFetch.value = null
    error.value = null
  }
  
  return {
    data,
    loading,
    error,
    load,
    clearCache
  }
}

// Hook para virtualización simple de listas
export const useVirtualList = (items, containerHeight, itemHeight) => {
  const scrollTop = shallowRef(0)
  const visibleCount = computed(() => Math.ceil(containerHeight / itemHeight))
  const totalHeight = computed(() => items.value.length * itemHeight)
  
  const visibleItems = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight)
    const end = start + visibleCount.value + 1 // +1 para buffer
    
    return items.value.slice(start, end).map((item, index) => ({
      item,
      index: start + index,
      style: {
        position: 'absolute',
        top: `${(start + index) * itemHeight}px`,
        height: `${itemHeight}px`,
        width: '100%'
      }
    }))
  })
  
  const handleScroll = (event) => {
    scrollTop.value = event.target.scrollTop
  }
  
  return {
    visibleItems,
    totalHeight,
    handleScroll
  }
}
