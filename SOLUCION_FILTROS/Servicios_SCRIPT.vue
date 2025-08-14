  kilometrajeActual: '',
  proximoServicio: '',
  descripcion: '',
  observaciones: ''
})

// 🔧 COMPUTED CORREGIDO PARA FILTROS
const serviciosFiltrados = computed(() => {
  console.log('🔍 Filtrando servicios...')
  
  // Comenzar con todos los servicios y agregar datos relacionados
  let resultado = servicios.value.map(servicio => ({
    ...servicio,
    vehiculo: obtenerVehiculoPorId(servicio.vehiculoId),
    cliente: obtenerClientePorId(servicio.clienteId)
  }))

  console.log('📊 Total servicios iniciales:', resultado.length)

  // 1. FILTRO POR TEXTO - Búsqueda mejorada
  if (filtroTexto.value && filtroTexto.value.trim() !== '') {
    const filtro = filtroTexto.value.toLowerCase().trim()
    const antes = resultado.length
    
    resultado = resultado.filter(servicio => {
      const match = (
        servicio.tipoServicio?.toLowerCase().includes(filtro) ||
        servicio.descripcion?.toLowerCase().includes(filtro) ||
        servicio.observaciones?.toLowerCase().includes(filtro) ||
        servicio.vehiculo?.marca?.toLowerCase().includes(filtro) ||
        servicio.vehiculo?.modelo?.toLowerCase().includes(filtro) ||
        servicio.vehiculo?.patente?.toLowerCase().includes(filtro) ||
        servicio.cliente?.nombre?.toLowerCase().includes(filtro)
      )
      return match
    })
    
    console.log(`🔍 Filtro texto "${filtro}": ${antes} → ${resultado.length}`)
  }

  // 2. FILTRO POR VEHÍCULO - CORREGIDO
  if (filtroVehiculo.value && filtroVehiculo.value !== '') {
    const vehiculoIdFiltro = parseInt(filtroVehiculo.value)
    const antes = resultado.length
    
    console.log(`🚗 Filtrando por vehículo ID: ${vehiculoIdFiltro}`)
    
    resultado = resultado.filter(servicio => {
      const match = servicio.vehiculoId === vehiculoIdFiltro
      
      if (showDebugInfo.value) {
        console.log(`   Servicio ${servicio.id}: vehiculoId=${servicio.vehiculoId}, match=${match}`)
      }
      
      return match
    })
    
    console.log(`🚗 Filtro vehículo: ${antes} → ${resultado.length}`)
  }

  // 3. FILTRO POR CLIENTE - CORREGIDO
  if (filtroCliente.value && filtroCliente.value !== '') {
    const clienteIdFiltro = parseInt(filtroCliente.value)
    const antes = resultado.length
    
    console.log(`👤 Filtrando por cliente ID: ${clienteIdFiltro}`)
    
    resultado = resultado.filter(servicio => {
      const match = servicio.clienteId === clienteIdFiltro
      
      if (showDebugInfo.value) {
        console.log(`   Servicio ${servicio.id}: clienteId=${servicio.clienteId}, match=${match}`)
      }
      
      return match
    })
    
    console.log(`👤 Filtro cliente: ${antes} → ${resultado.length}`)
  }

  // 4. FILTRO POR ESTADO - MEJORADO
  if (filtroEstado.value && filtroEstado.value !== '') {
    const antes = resultado.length
    
    resultado = resultado.filter(servicio => {
      const match = servicio.estado === filtroEstado.value
      return match
    })
    
    console.log(`📋 Filtro estado "${filtroEstado.value}": ${antes} → ${resultado.length}`)
  }

  // Ordenar por fecha más reciente
  const resultadoFinal = resultado.sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))
  
  console.log(`✅ Resultado final: ${resultadoFinal.length} servicios`)
  
  return resultadoFinal
})

// Paginación para cuando no se usa virtual scroll
const {
  currentPage,
  itemsPerPage,
  paginatedItems: paginatedServicios,
  totalPages,
  paginationInfo,
  pageRange,
  goToPage,
  nextPage,
  prevPage,
  firstPage,
  lastPage
} = usePagination(serviciosFiltrados, 20)

// ✅ COMPUTED MEJORADOS
const hayFiltros = computed(() => {
  const filtros = Boolean(
    (filtroTexto.value && filtroTexto.value.trim()) ||
    (filtroVehiculo.value && filtroVehiculo.value !== '') ||
    (filtroCliente.value && filtroCliente.value !== '') ||
    (filtroEstado.value && filtroEstado.value !== '')
  )
  return filtros
})

const clienteSeleccionado = computed(() => {
  if (formulario.value.vehiculoId) {
    const vehiculo = obtenerVehiculoPorId(parseInt(formulario.value.vehiculoId))
    return vehiculo ? obtenerClientePorId(vehiculo.clienteId) : null
  }
  return null
})

// 🔧 FUNCIONES DE FILTROS CORREGIDAS
const limpiarFiltros = () => {
  console.log('🧹 Limpiando todos los filtros')
  
  filtroTexto.value = ''
  filtroVehiculo.value = ''
  filtroCliente.value = ''
  filtroEstado.value = ''
}

const onFiltroVehiculoChange = () => {
  console.log('🚗 Cambio en filtro vehículo:', filtroVehiculo.value)
}

const onFiltroClienteChange = () => {
  console.log('👤 Cambio en filtro cliente:', filtroCliente.value)
}

const onFiltroEstadoChange = () => {
  console.log('📋 Cambio en filtro estado:', filtroEstado.value)
}

// FUNCIONES EXISTENTES
const formatearEstado = (estado) => {
  const estados = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completado: 'Completado',
    cancelado: 'Cancelado'
  }
  return estados[estado] || estado
}

// FUNCIÓN PARA CORREGIR EL PROBLEMA DE FECHAS
const formatearFecha = (fecha) => {
  if (!fecha) return ''
  
  // Crear fecha local para evitar problema de zona horaria
  const fechaLocal = new Date(fecha + 'T00:00:00')
  
  return fechaLocal.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// FUNCIONES PARA CALCULAR DÍAS RESTANTES
const calcularDiasRestantes = (fechaProximoServicio) => {
  if (!fechaProximoServicio) return null
  
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0) // Resetear horas para comparación exacta
  
  const fechaServicio = new Date(fechaProximoServicio + 'T00:00:00')
  
  const diferenciaTiempo = fechaServicio.getTime() - hoy.getTime()
  const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24))
  
  return diferenciaDias
}

const formatearDiasRestantes = (fechaProximoServicio) => {
  const dias = calcularDiasRestantes(fechaProximoServicio)
  
  if (dias === null) return '-'
  
  if (dias < 0) {
    return `${Math.abs(dias)} días vencido`
  } else if (dias === 0) {
    return 'Hoy'
  } else if (dias === 1) {
    return 'Mañana'
  } else {
    return `${dias} días`
  }
}

const limpiarFormulario = () => {
  formulario.value = {
    vehiculoId: '',
    clienteId: '',
    tipoServicio: '',
    fechaServicio: '',
    estado: 'pendiente',
    costo: '',
    kilometrajeActual: '',
    proximoServicio: '',
    descripcion: '',
    observaciones: ''
  }
}

const onVehiculoChange = () => {
  if (formulario.value.vehiculoId) {
    const vehiculo = obtenerVehiculoPorId(parseInt(formulario.value.vehiculoId))
    if (vehiculo) {
      formulario.value.clienteId = vehiculo.clienteId
    }
  }
}

const editarServicio = (servicio) => {
  servicioEditando.value = servicio
  formulario.value = {
    ...servicio,
    fechaServicio: servicio.fechaServicio.split('T')[0],
    proximoServicio: servicio.proximoServicio ? servicio.proximoServicio.split('T')[0] : '',
    costo: servicio.costo || '',
    kilometrajeActual: servicio.kilometrajeActual || '',
    vehiculoId: servicio.vehiculoId.toString(),
    clienteId: servicio.clienteId.toString()
  }
  mostrarFormulario.value = true
}

const guardarServicio = () => {
  const datosServicio = {
    ...formulario.value,
    vehiculoId: parseInt(formulario.value.vehiculoId),
    clienteId: parseInt(formulario.value.clienteId),
    costo: formulario.value.costo ? parseFloat(formulario.value.costo) : 0,
    kilometrajeActual: formulario.value.kilometrajeActual ? parseInt(formulario.value.kilometrajeActual) : 0,
    fechaServicio: formulario.value.fechaServicio,
    proximoServicio: formulario.value.proximoServicio || null
  }

  if (servicioEditando.value) {
    actualizarServicio(servicioEditando.value.id, datosServicio)
  } else {
    agregarServicio(datosServicio)
  }
  cancelarFormulario()
}

const cancelarFormulario = () => {
  mostrarFormulario.value = false
  servicioEditando.value = null
  limpiarFormulario()
}

const eliminarServicioConfirm = (servicioId) => {
  if (confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
    eliminarServicio(servicioId)
  }
}

// 🔧 WATCHERS PARA DEBUG (remover en producción)
watch([filtroVehiculo, filtroCliente, filtroEstado, filtroTexto], ([vehiculo, cliente, estado, texto]) => {
  if (showDebugInfo.value) {
    console.log('📊 Cambio en filtros:', { vehiculo, cliente, estado, texto })
  }
}, { immediate: false })

// Inicialización
onMounted(() => {
  console.log('🚀 Iniciando componente Servicios')
  
  // Manejar parámetros de URL
  if (route.query.vehiculo) {
    filtroVehiculo.value = route.query.vehiculo
    console.log('🔗 Filtro desde URL:', route.query.vehiculo)
  }
  
  if (route.query.nuevo === 'true') {
    if (route.query.vehiculo) {
      formulario.value.vehiculoId = route.query.vehiculo
      onVehiculoChange()
    }
    mostrarFormulario.value = true
  }
  
  // Activar virtual scroll automáticamente si hay muchos registros
  if (servicios.value.length > 100) {
    useVirtualScroll.value = true
  }
  
  // Activar debug en desarrollo
  if (import.meta.env.DEV) {
    showDebugInfo.value = true
    console.log('🔧 Modo debug activado')
    
    // Log inicial de datos
    console.log('📊 Datos iniciales:')
    console.log('   Servicios:', servicios.value.length)
    console.log('   Vehículos:', vehiculos.value.length)
    console.log('   Clientes:', clientes.value.length)
    
    safeInterval(() => {
      const leaks = detectLeaks()
      if (leaks.length > 0) {
        console.warn('[Servicios] Posibles memory leaks:', leaks)
      }
    }, 30000) // Cada 30 segundos
  }
})
</script>
