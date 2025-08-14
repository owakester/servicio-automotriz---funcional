import { ref, computed, watch } from 'vue'

export const useSmartCache = () => {
  // Cache en memoria para sesión actual
  const memoryCache = ref(new Map())
  
  // Configuración de caché
  const cacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    maxItems: 1000
  }
  
  // Obtener tamaño actual del localStorage
  const getStorageSize = () => {
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    return totalSize
  }
  
  // Limpiar entradas antiguas
  const cleanOldEntries = () => {
    const now = Date.now()
    const keysToRemove = []
    
    for (let key in localStorage) {
      if (key.startsWith('cache_')) {
        try {
          const data = JSON.parse(localStorage[key])
          if (data.expires && data.expires < now) {
            keysToRemove.push(key)
          }
        } catch (e) {
          // Si no se puede parsear, eliminar
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
  
  // Guardar en caché
  const set = (key, value, options = {}) => {
    const {
      ttl = cacheConfig.maxAge,
      priority = 'normal',
      compress = false
    } = options
    
    const cacheKey = `cache_${key}`
    const cacheData = {
      value,
      timestamp: Date.now(),
      expires: Date.now() + ttl,
      priority,
      hits: 0
    }
    
    // Primero intentar guardar en memoria
    memoryCache.value.set(key, cacheData)
    
    // Verificar espacio antes de guardar en localStorage
    const dataString = JSON.stringify(cacheData)
    const currentSize = getStorageSize()
    
    if (currentSize + dataString.length > cacheConfig.maxSize) {
      // Limpiar entradas antiguas o de baja prioridad
      cleanOldEntries()
      evictLowPriorityItems(dataString.length)
    }
    
    try {
      localStorage.setItem(cacheKey, dataString)
    } catch (e) {
      console.warn('Cache storage full, using memory cache only')
    }
  }
  
  // Obtener de caché
  const get = (key) => {
    // Primero buscar en memoria
    if (memoryCache.value.has(key)) {
      const memData = memoryCache.value.get(key)
      if (memData.expires > Date.now()) {
        memData.hits++
        return memData.value
      } else {
        memoryCache.value.delete(key)
      }
    }
    
    // Luego buscar en localStorage
    const cacheKey = `cache_${key}`
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      try {
        const data = JSON.parse(cached)
        
        if (data.expires > Date.now()) {
          // Actualizar hits
          data.hits++
          localStorage.setItem(cacheKey, JSON.stringify(data))
          
          // Guardar en memoria para acceso rápido
          memoryCache.value.set(key, data)
          
          return data.value
        } else {
          // Expirado, eliminar
          localStorage.removeItem(cacheKey)
        }
      } catch (e) {
        localStorage.removeItem(cacheKey)
      }
    }
    
    return null
  }
  
  // Invalidar caché
  const invalidate = (key) => {
    memoryCache.value.delete(key)
    localStorage.removeItem(`cache_${key}`)
  }
  
  // Invalidar por patrón
  const invalidatePattern = (pattern) => {
    // Limpiar memoria
    for (let [key] of memoryCache.value) {
      if (key.match(pattern)) {
        memoryCache.value.delete(key)
      }
    }
    
    // Limpiar localStorage
    for (let key in localStorage) {
      if (key.startsWith('cache_') && key.match(pattern)) {
        localStorage.removeItem(key)
      }
    }
  }
  
  // Desalojar items de baja prioridad
  const evictLowPriorityItems = (bytesNeeded) => {
    const items = []
    
    for (let key in localStorage) {
      if (key.startsWith('cache_')) {
        try {
          const data = JSON.parse(localStorage[key])
          items.push({
            key,
            priority: data.priority || 'normal',
            hits: data.hits || 0,
            size: localStorage[key].length,
            timestamp: data.timestamp
          })
        } catch (e) {}
      }
    }
    
    // Ordenar por prioridad y hits
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorities = { low: 0, normal: 1, high: 2 }
        return priorities[a.priority] - priorities[b.priority]
      }
      return a.hits - b.hits
    })
    
    let freedBytes = 0
    for (let item of items) {
      if (freedBytes >= bytesNeeded) break
      localStorage.removeItem(item.key)
      freedBytes += item.size
    }
  }
  
  // Cache con fetch automático
  const getOrFetch = async (key, fetcher, options = {}) => {
    const cached = get(key)
    if (cached !== null) {
      return cached
    }
    
    try {
      const data = await fetcher()
      set(key, data, options)
      return data
    } catch (error) {
      console.error('Error fetching data for cache:', error)
      throw error
    }
  }
  
  // Estadísticas de caché
  const getStats = () => {
    const stats = {
      memoryItems: memoryCache.value.size,
      storageItems: 0,
      totalSize: 0,
      hitRate: 0,
      totalHits: 0,
      totalRequests: 0
    }
    
    for (let key in localStorage) {
      if (key.startsWith('cache_')) {
        stats.storageItems++
        stats.totalSize += localStorage[key].length
        
        try {
          const data = JSON.parse(localStorage[key])
          stats.totalHits += data.hits || 0
          stats.totalRequests++
        } catch (e) {}
      }
    }
    
    if (stats.totalRequests > 0) {
      stats.hitRate = (stats.totalHits / stats.totalRequests) * 100
    }
    
    return stats
  }
  
  // Limpiar caché completo
  const clear = () => {
    memoryCache.value.clear()
    
    const keysToRemove = []
    for (let key in localStorage) {
      if (key.startsWith('cache_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
  
  // Inicializar limpieza periódica
  setInterval(cleanOldEntries, 60 * 60 * 1000) // Cada hora
  
  return {
    set,
    get,
    invalidate,
    invalidatePattern,
    getOrFetch,
    getStats,
    clear,
    cleanOldEntries
  }
}
