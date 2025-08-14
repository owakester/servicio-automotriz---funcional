import { ref, computed, watch } from 'vue'

export const usePagination = (items, itemsPerPageDefault = 10) => {
  const currentPage = ref(1)
  const itemsPerPageRef = ref(itemsPerPageDefault)
  const searchQuery = ref('')
  
  // Guardar preferencias en localStorage
  const savedItemsPerPage = localStorage.getItem('itemsPerPage')
  if (savedItemsPerPage) {
    itemsPerPageRef.value = parseInt(savedItemsPerPage)
  }
  
  watch(itemsPerPageRef, (value) => {
    localStorage.setItem('itemsPerPage', value)
    currentPage.value = 1 // Reset a primera página cuando cambia items por página
  })
  
  // Filtrar items basado en búsqueda
  const filteredItems = computed(() => {
    if (!searchQuery.value) return items.value
    
    const query = searchQuery.value.toLowerCase()
    return items.value.filter(item => {
      // Buscar en todos los valores string del objeto
      return Object.values(item).some(value => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query)
        }
        if (typeof value === 'number') {
          return value.toString().includes(query)
        }
        return false
      })
    })
  })
  
  // Calcular páginas totales
  const totalPages = computed(() => {
    return Math.ceil(filteredItems.value.length / itemsPerPageRef.value)
  })
  
  // Items de la página actual
  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPageRef.value
    const end = start + itemsPerPageRef.value
    return filteredItems.value.slice(start, end)
  })
  
  // Información de paginación
  const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPageRef.value + 1
    const end = Math.min(currentPage.value * itemsPerPageRef.value, filteredItems.value.length)
    const total = filteredItems.value.length
    
    return {
      start: total > 0 ? start : 0,
      end,
      total,
      currentPage: currentPage.value,
      totalPages: totalPages.value
    }
  })
  
  // Rango de páginas para mostrar
  const pageRange = computed(() => {
    const range = []
    const rangeSize = 5
    const halfRange = Math.floor(rangeSize / 2)
    
    let start = Math.max(currentPage.value - halfRange, 1)
    let end = Math.min(start + rangeSize - 1, totalPages.value)
    
    if (end - start + 1 < rangeSize) {
      start = Math.max(end - rangeSize + 1, 1)
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i)
    }
    
    return range
  })
  
  // Métodos de navegación
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }
  
  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }
  
  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }
  
  const firstPage = () => {
    currentPage.value = 1
  }
  
  const lastPage = () => {
    currentPage.value = totalPages.value
  }
  
  // Reset cuando cambia la búsqueda
  watch(searchQuery, () => {
    currentPage.value = 1
  })
  
  // Reset cuando los items cambian significativamente
  watch(() => items.value.length, (newLength, oldLength) => {
    if (Math.abs(newLength - oldLength) > itemsPerPageRef.value) {
      currentPage.value = 1
    }
  })
  
  // Computed para exponer itemsPerPage
  const itemsPerPage = computed({
    get: () => itemsPerPageRef.value,
    set: (value) => {
      itemsPerPageRef.value = value
    }
  })
  
  return {
    // Estado
    currentPage,
    itemsPerPage,
    searchQuery,
    
    // Computed
    paginatedItems,
    totalPages,
    paginationInfo,
    pageRange,
    filteredItems,
    
    // Métodos
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage
  }
}
