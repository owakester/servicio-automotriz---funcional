import { onUnmounted, getCurrentInstance } from 'vue'

export const useMemoryLeakPrevention = () => {
  const instance = getCurrentInstance()
  const cleanupFunctions = []
  const intervals = new Set()
  const timeouts = new Set()
  const eventListeners = new Map()
  const observers = new Set()
  
  // Wrapper para setInterval que auto-limpia
  const safeInterval = (callback, delay) => {
    const id = setInterval(callback, delay)
    intervals.add(id)
    return id
  }
  
  // Wrapper para setTimeout que auto-limpia
  const safeTimeout = (callback, delay) => {
    const id = setTimeout(() => {
      timeouts.delete(id)
      callback()
    }, delay)
    timeouts.add(id)
    return id
  }
  
  // Wrapper para addEventListener que auto-remueve
  const safeAddEventListener = (target, event, handler, options) => {
    target.addEventListener(event, handler, options)
    
    if (!eventListeners.has(target)) {
      eventListeners.set(target, [])
    }
    
    eventListeners.get(target).push({ event, handler, options })
  }
  
  // Wrapper para observers (Intersection, Resize, Mutation)
  const safeObserver = (observer) => {
    observers.add(observer)
    return observer
  }
  
  // Agregar función de limpieza personalizada
  const addCleanup = (cleanupFn) => {
    cleanupFunctions.push(cleanupFn)
  }
  
  // Limpiar interval específico
  const clearSafeInterval = (id) => {
    clearInterval(id)
    intervals.delete(id)
  }
  
  // Limpiar timeout específico
  const clearSafeTimeout = (id) => {
    clearTimeout(id)
    timeouts.delete(id)
  }
  
  // Detectar posibles memory leaks
  const detectLeaks = () => {
    const leaks = []
    
    // Verificar referencias circulares en data
    if (instance?.proxy) {
      const checkCircular = (obj, seen = new WeakSet()) => {
        if (obj && typeof obj === 'object') {
          if (seen.has(obj)) {
            leaks.push({
              type: 'circular',
              message: 'Posible referencia circular detectada'
            })
            return
          }
          
          seen.add(obj)
          
          Object.values(obj).forEach(value => {
            checkCircular(value, seen)
          })
        }
      }
      
      checkCircular(instance.proxy.$data)
    }
    
    // Verificar event listeners no removidos
    if (eventListeners.size > 10) {
      leaks.push({
        type: 'eventListeners',
        count: eventListeners.size,
        message: `${eventListeners.size} event listeners activos`
      })
    }
    
    // Verificar timers activos
    if (intervals.size > 5) {
      leaks.push({
        type: 'intervals',
        count: intervals.size,
        message: `${intervals.size} intervals activos`
      })
    }
    
    return leaks
  }
  
  // Limpiar todos los recursos al desmontar
  onUnmounted(() => {
    // Limpiar intervals
    intervals.forEach(id => clearInterval(id))
    intervals.clear()
    
    // Limpiar timeouts
    timeouts.forEach(id => clearTimeout(id))
    timeouts.clear()
    
    // Limpiar event listeners
    eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ event, handler, options }) => {
        target.removeEventListener(event, handler, options)
      })
    })
    eventListeners.clear()
    
    // Limpiar observers
    observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect()
      }
    })
    observers.clear()
    
    // Ejecutar funciones de limpieza personalizadas
    cleanupFunctions.forEach(fn => {
      try {
        fn()
      } catch (error) {
        console.error('Error en función de limpieza:', error)
      }
    })
    cleanupFunctions.length = 0
    
    // Log de limpieza en desarrollo
    if (import.meta.env.DEV) {
      console.log(`[Memory] Componente limpiado: ${instance?.type?.name || 'Unknown'}`)
    }
  })
  
  return {
    safeInterval,
    safeTimeout,
    safeAddEventListener,
    safeObserver,
    addCleanup,
    clearSafeInterval,
    clearSafeTimeout,
    detectLeaks
  }
}

// Hook para monitorear el uso de memoria
export const useMemoryMonitor = () => {
  const getMemoryUsage = () => {
    if (!performance.memory) {
      return null
    }
    
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576), // MB
      percentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    }
  }
  
  const checkMemoryPressure = () => {
    const memory = getMemoryUsage()
    if (!memory) return 'unknown'
    
    if (memory.percentage > 90) return 'critical'
    if (memory.percentage > 70) return 'high'
    if (memory.percentage > 50) return 'medium'
    return 'low'
  }
  
  const forceGarbageCollection = () => {
    if (window.gc) {
      window.gc()
      console.log('[Memory] Garbage collection forzado')
    } else {
      console.warn('[Memory] Garbage collection no disponible')
    }
  }
  
  return {
    getMemoryUsage,
    checkMemoryPressure,
    forceGarbageCollection
  }
}
