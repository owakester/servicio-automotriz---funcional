import { ref, onMounted, onUnmounted } from 'vue'

export const usePerformanceMonitor = () => {
  const metrics = ref({
    renderTime: 0,
    memoryUsage: 0,
    domNodes: 0,
    listeners: 0,
    fps: 0
  })
  
  let rafId = null
  let lastTime = performance.now()
  let frames = 0
  
  // Medir FPS
  const measureFPS = () => {
    frames++
    const currentTime = performance.now()
    
    if (currentTime >= lastTime + 1000) {
      metrics.value.fps = Math.round((frames * 1000) / (currentTime - lastTime))
      frames = 0
      lastTime = currentTime
    }
    
    rafId = requestAnimationFrame(measureFPS)
  }
  
  // Obtener métricas del DOM
  const updateMetrics = () => {
    // Contar nodos del DOM
    metrics.value.domNodes = document.getElementsByTagName('*').length
    
    // Contar event listeners (aproximado)
    const allElements = document.querySelectorAll('*')
    let listenerCount = 0
    allElements.forEach(element => {
      const listeners = getEventListeners(element)
      if (listeners) {
        Object.keys(listeners).forEach(event => {
          listenerCount += listeners[event].length
        })
      }
    })
    metrics.value.listeners = listenerCount
    
    // Memoria (si está disponible)
    if (performance.memory) {
      metrics.value.memoryUsage = Math.round(
        (performance.memory.usedJSHeapSize / 1048576) * 100
      ) / 100 // MB
    }
  }
  
  // Función auxiliar para obtener listeners (solo en desarrollo)
  const getEventListeners = (element) => {
    if (typeof window.getEventListeners === 'function') {
      return window.getEventListeners(element)
    }
    return null
  }
  
  // Medir tiempo de render de componente
  const measureComponentRender = (componentName) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`)
      
      // Guardar métricas para análisis
      const perfData = JSON.parse(localStorage.getItem('performanceData') || '{}')
      if (!perfData[componentName]) {
        perfData[componentName] = []
      }
      
      perfData[componentName].push({
        time: renderTime,
        timestamp: new Date().toISOString()
      })
      
      // Mantener solo las últimas 100 mediciones
      if (perfData[componentName].length > 100) {
        perfData[componentName] = perfData[componentName].slice(-100)
      }
      
      localStorage.setItem('performanceData', JSON.stringify(perfData))
      
      return renderTime
    }
  }
  
  // Detectar re-renders excesivos
  const detectExcessiveRerenders = (componentName, threshold = 10) => {
    let renderCount = 0
    let lastResetTime = Date.now()
    
    return () => {
      renderCount++
      const currentTime = Date.now()
      
      // Reset cada segundo
      if (currentTime - lastResetTime > 1000) {
        if (renderCount > threshold) {
          console.warn(
            `[Performance Warning] ${componentName} rendered ${renderCount} times in 1 second`
          )
        }
        renderCount = 0
        lastResetTime = currentTime
      }
    }
  }
  
  // Analizar datos de performance
  const getPerformanceReport = () => {
    const perfData = JSON.parse(localStorage.getItem('performanceData') || '{}')
    const report = {}
    
    Object.keys(perfData).forEach(component => {
      const times = perfData[component].map(d => d.time)
      report[component] = {
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      }
    })
    
    return report
  }
  
  onMounted(() => {
    measureFPS()
    updateMetrics()
    
    // Actualizar métricas cada 2 segundos
    const interval = setInterval(updateMetrics, 2000)
    
    onUnmounted(() => {
      if (rafId) cancelAnimationFrame(rafId)
      clearInterval(interval)
    })
  })
  
  return {
    metrics,
    measureComponentRender,
    detectExcessiveRerenders,
    getPerformanceReport
  }
}
