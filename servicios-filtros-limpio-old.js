// VERSIÓN LIMPIA DEL COMPUTED serviciosFiltrados (SIN LOGS DE DEPURACIÓN)
// Para usar después de verificar que los filtros funcionan correctamente

const serviciosFiltrados = computed(() => {
  let resultado = servicios.value.map(servicio => ({
    ...servicio,
    vehiculo: obtenerVehiculoPorId(servicio.vehiculoId),
    cliente: obtenerClientePorId(servicio.clienteId)
  }))

  // Filtro por texto - MEJORADO
  if (filtroTexto.value && filtroTexto.value.trim() !== '') {
    const filtro = filtroTexto.value.toLowerCase().trim()
    resultado = resultado.filter(servicio => 
      servicio.tipoServicio?.toLowerCase().includes(filtro) ||
      servicio.descripcion?.toLowerCase().includes(filtro) ||
      servicio.observaciones?.toLowerCase().includes(filtro)
    )
  }

  // Filtro por vehículo - CORREGIDO
  if (filtroVehiculo.value && filtroVehiculo.value !== '') {
    const vehiculoIdFiltro = parseInt(filtroVehiculo.value)
    resultado = resultado.filter(servicio => 
      servicio.vehiculoId === vehiculoIdFiltro
    )
  }

  // Filtro por cliente - CORREGIDO
  if (filtroCliente.value && filtroCliente.value !== '') {
    const clienteIdFiltro = parseInt(filtroCliente.value)
    resultado = resultado.filter(servicio => 
      servicio.clienteId === clienteIdFiltro
    )
  }

  // Filtro por estado - MEJORADO
  if (filtroEstado.value && filtroEstado.value !== '') {
    resultado = resultado.filter(servicio => 
      servicio.estado === filtroEstado.value
    )
  }

  return resultado.sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))
})
