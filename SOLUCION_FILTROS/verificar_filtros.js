// SCRIPT DE VERIFICACIÓN MEJORADO PARA FILTROS
// Ejecutar este script en la consola del navegador para diagnosticar problemas

console.clear()
console.log('🔧 DIAGNÓSTICO AVANZADO DE FILTROS - SERVICIOS')
console.log('='.repeat(60))

// 1. Verificar datos en localStorage
const serviciosData = localStorage.getItem('autoservice_servicios')
const vehiculosData = localStorage.getItem('autoservice_vehiculos') 
const clientesData = localStorage.getItem('autoservice_clientes')

console.log('📦 DATOS EN LOCALSTORAGE:')
console.log('Servicios:', serviciosData ? JSON.parse(serviciosData).length : '❌ NO DATOS')
console.log('Vehículos:', vehiculosData ? JSON.parse(vehiculosData).length : '❌ NO DATOS')
console.log('Clientes:', clientesData ? JSON.parse(clientesData).length : '❌ NO DATOS')

if (!serviciosData || !vehiculosData || !clientesData) {
  console.log('❌ DATOS FALTANTES EN LOCALSTORAGE')
  console.log('💡 Soluciones:')
  console.log('   1. Ir a Configuración → Cargar datos demo')
  console.log('   2. O ejecutar: localStorage.clear(); location.reload()')
  console.log('   3. Luego volver a cargar los datos demo')
} else {
  const servicios = JSON.parse(serviciosData)
  const vehiculos = JSON.parse(vehiculosData)
  const clientes = JSON.parse(clientesData)
  
  console.log('\n🚗 VEHÍCULOS DISPONIBLES:')
  vehiculos.forEach(vehiculo => {
    console.log(`ID: ${vehiculo.id} | ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.patente} | Cliente ID: ${vehiculo.clienteId}`)
  })
  
  console.log('\n👤 CLIENTES DISPONIBLES:')
  clientes.forEach(cliente => {
    console.log(`ID: ${cliente.id} | ${cliente.nombre} | Tel: ${cliente.telefono || 'Sin teléfono'}`)
  })
  
  console.log('\n🔧 SERVICIOS Y SUS RELACIONES:')
  servicios.forEach(servicio => {
    const vehiculo = vehiculos.find(v => v.id === servicio.vehiculoId)
    const cliente = clientes.find(c => c.id === servicio.clienteId)
    
    console.log(`Servicio ID: ${servicio.id}`)
    console.log(`  └─ Vehículo ID: ${servicio.vehiculoId} (tipo: ${typeof servicio.vehiculoId})`)
    console.log(`  └─ Vehículo: ${vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.patente}` : '❌ NO ENCONTRADO'}`)
    console.log(`  └─ Cliente ID: ${servicio.clienteId} (tipo: ${typeof servicio.clienteId})`)
    console.log(`  └─ Cliente: ${cliente ? cliente.nombre : '❌ NO ENCONTRADO'}`)
    console.log(`  └─ Tipo: ${servicio.tipoServicio}`)
    console.log(`  └─ Estado: ${servicio.estado}`)
    console.log(`  └─ Fecha: ${servicio.fechaServicio}`)
    console.log('')
  })

  // Verificar consistencia de datos
  console.log('🔍 VERIFICACIÓN DE CONSISTENCIA:')
  let problemasEncontrados = 0
  
  servicios.forEach(servicio => {
    const vehiculo = vehiculos.find(v => v.id === servicio.vehiculoId)
    const cliente = clientes.find(c => c.id === servicio.clienteId)
    
    if (!vehiculo) {
      console.error(`❌ Servicio ${servicio.id}: Vehículo ID ${servicio.vehiculoId} no existe`)
      problemasEncontrados++
    }
    
    if (!cliente) {
      console.error(`❌ Servicio ${servicio.id}: Cliente ID ${servicio.clienteId} no existe`)
      problemasEncontrados++
    }
    
    if (vehiculo && cliente && vehiculo.clienteId !== cliente.id) {
      console.warn(`⚠️ Servicio ${servicio.id}: Inconsistencia - Vehículo pertenece a cliente ${vehiculo.clienteId} pero servicio está asignado a cliente ${cliente.id}`)
      problemasEncontrados++
    }
    
    // Verificar tipos de datos
    if (typeof servicio.vehiculoId !== 'number') {
      console.warn(`⚠️ Servicio ${servicio.id}: vehiculoId debe ser number, es ${typeof servicio.vehiculoId}`)
      problemasEncontrados++
    }
    
    if (typeof servicio.clienteId !== 'number') {
      console.warn(`⚠️ Servicio ${servicio.id}: clienteId debe ser number, es ${typeof servicio.clienteId}`)
      problemasEncontrados++
    }
  })
  
  if (problemasEncontrados === 0) {
    console.log('✅ No se encontraron problemas de consistencia')
  } else {
    console.log(`❌ Se encontraron ${problemasEncontrados} problemas`)
  }

  // PRUEBAS DE FILTROS SIMULADAS
  console.log('\n🧪 SIMULACIÓN DE FILTROS:')
  
  // Simular filtro por vehículo
  if (vehiculos.length > 0) {
    const primerVehiculo = vehiculos[0]
    const serviciosFiltrados = servicios.filter(s => s.vehiculoId === primerVehiculo.id)
    console.log(`🚗 Filtro por vehículo ${primerVehiculo.marca} ${primerVehiculo.modelo} (ID: ${primerVehiculo.id}):`)
    console.log(`   Total servicios: ${servicios.length} → Filtrados: ${serviciosFiltrados.length}`)
    
    if (serviciosFiltrados.length === 0) {
      console.warn('   ⚠️ No hay servicios para este vehículo')
    }
  }
  
  // Simular filtro por cliente
  if (clientes.length > 0) {
    const primerCliente = clientes[0]
    const serviciosFiltrados = servicios.filter(s => s.clienteId === primerCliente.id)
    console.log(`👤 Filtro por cliente ${primerCliente.nombre} (ID: ${primerCliente.id}):`)
    console.log(`   Total servicios: ${servicios.length} → Filtrados: ${serviciosFiltrados.length}`)
    
    if (serviciosFiltrados.length === 0) {
      console.warn('   ⚠️ No hay servicios para este cliente')
    }
  }
  
  // Simular filtro por estado
  const estados = ['pendiente', 'en_progreso', 'completado', 'cancelado']
  estados.forEach(estado => {
    const serviciosFiltrados = servicios.filter(s => s.estado === estado)
    console.log(`📋 Filtro por estado '${estado}': ${serviciosFiltrados.length} servicios`)
  })
  
  // Simular búsqueda de texto
  const terminos = ['aceite', 'toyota', 'revision']
  terminos.forEach(termino => {
    const serviciosFiltrados = servicios.filter(servicio => {
      const vehiculo = vehiculos.find(v => v.id === servicio.vehiculoId)
      const cliente = clientes.find(c => c.id === servicio.clienteId)
      
      return (
        servicio.tipoServicio?.toLowerCase().includes(termino.toLowerCase()) ||
        servicio.descripcion?.toLowerCase().includes(termino.toLowerCase()) ||
        servicio.observaciones?.toLowerCase().includes(termino.toLowerCase()) ||
        vehiculo?.marca?.toLowerCase().includes(termino.toLowerCase()) ||
        vehiculo?.modelo?.toLowerCase().includes(termino.toLowerCase()) ||
        vehiculo?.patente?.toLowerCase().includes(termino.toLowerCase()) ||
        cliente?.nombre?.toLowerCase().includes(termino.toLowerCase())
      )
    })
    
    console.log(`🔍 Búsqueda '${termino}': ${serviciosFiltrados.length} resultados`)
  })

  // Sugerir pruebas manuales
  console.log('\n🎯 PRUEBAS MANUALES SUGERIDAS:')
  
  if (vehiculos.length > 0) {
    const vehiculoSugerido = vehiculos.find(v => 
      servicios.some(s => s.vehiculoId === v.id)
    )
    
    if (vehiculoSugerido) {
      console.log(`1. 🚗 Selecciona el vehículo: "${vehiculoSugerido.marca} ${vehiculoSugerido.modelo} - ${vehiculoSugerido.patente}"`)
      console.log(`   ID a buscar: ${vehiculoSugerido.id}`)
      
      const serviciosVehiculo = servicios.filter(s => s.vehiculoId === vehiculoSugerido.id)
      console.log(`   Servicios esperados: ${serviciosVehiculo.length}`)
      serviciosVehiculo.forEach(s => {
        console.log(`     - ${s.tipoServicio} (${s.fechaServicio})`)
      })
    }
  }
  
  if (clientes.length > 0) {
    const clienteSugerido = clientes.find(c => 
      servicios.some(s => s.clienteId === c.id)
    )
    
    if (clienteSugerido) {
      console.log(`2. 👤 Selecciona el cliente: "${clienteSugerido.nombre}"`)
      console.log(`   ID a buscar: ${clienteSugerido.id}`)
      
      const serviciosCliente = servicios.filter(s => s.clienteId === clienteSugerido.id)
      console.log(`   Servicios esperados: ${serviciosCliente.length}`)
    }
  }
  
  console.log('3. 📋 Prueba filtros de estado: pendiente, en_progreso, completado')
  console.log('4. 🔍 Prueba búsquedas: "aceite", "toyota", "revision"')

}

console.log('\n🔧 COMANDOS ÚTILES:')
console.log('localStorage.clear()                           // Limpiar todos los datos')
console.log('location.reload()                             // Recargar página')
console.log('localStorage.removeItem("autoservice_servicios") // Limpiar solo servicios')

// Función helper para corregir tipos de datos
console.log('\n🛠️ FUNCIÓN DE REPARACIÓN:')
console.log('Ejecuta esto si hay problemas de tipos:')
console.log(`
function repararTiposDatos() {
  const servicios = JSON.parse(localStorage.getItem('autoservice_servicios') || '[]')
  const vehiculos = JSON.parse(localStorage.getItem('autoservice_vehiculos') || '[]')
  const clientes = JSON.parse(localStorage.getItem('autoservice_clientes') || '[]')
  
  // Corregir tipos en servicios
  const serviciosCorregidos = servicios.map(servicio => ({
    ...servicio,
    id: typeof servicio.id === 'number' ? servicio.id : parseInt(servicio.id),
    vehiculoId: typeof servicio.vehiculoId === 'number' ? servicio.vehiculoId : parseInt(servicio.vehiculoId),
    clienteId: typeof servicio.clienteId === 'number' ? servicio.clienteId : parseInt(servicio.clienteId),
    costo: typeof servicio.costo === 'number' ? servicio.costo : parseFloat(servicio.costo || 0)
  }))
  
  // Corregir tipos en vehículos
  const vehiculosCorregidos = vehiculos.map(vehiculo => ({
    ...vehiculo,
    id: typeof vehiculo.id === 'number' ? vehiculo.id : parseInt(vehiculo.id),
    clienteId: typeof vehiculo.clienteId === 'number' ? vehiculo.clienteId : parseInt(vehiculo.clienteId)
  }))
  
  // Corregir tipos en clientes
  const clientesCorregidos = clientes.map(cliente => ({
    ...cliente,
    id: typeof cliente.id === 'number' ? cliente.id : parseInt(cliente.id)
  }))
  
  // Guardar datos corregidos
  localStorage.setItem('autoservice_servicios', JSON.stringify(serviciosCorregidos))
  localStorage.setItem('autoservice_vehiculos', JSON.stringify(vehiculosCorregidos))
  localStorage.setItem('autoservice_clientes', JSON.stringify(clientesCorregidos))
  
  console.log('✅ Tipos de datos corregidos')
  location.reload()
}`)

console.log('\n📊 RESUMEN:')
if (serviciosData && vehiculosData && clientesData) {
  const servicios = JSON.parse(serviciosData)
  const vehiculos = JSON.parse(vehiculosData)
  const clientes = JSON.parse(clientesData)
  
  console.log(`- ${servicios.length} servicios registrados`)
  console.log(`- ${vehiculos.length} vehículos registrados`)
  console.log(`- ${clientes.length} clientes registrados`)
  
  // Verificar si hay servicios huérfanos
  const serviciosHuerfanos = servicios.filter(s => 
    !vehiculos.find(v => v.id === s.vehiculoId) ||
    !clientes.find(c => c.id === s.clienteId)
  )
  
  if (serviciosHuerfanos.length > 0) {
    console.log(`❌ ${serviciosHuerfanos.length} servicios con referencias rotas`)
  } else {
    console.log('✅ Todas las referencias están correctas')
  }
} else {
  console.log('❌ Datos incompletos - necesario cargar datos demo')
}
