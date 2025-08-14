// SCRIPT DE DEPURACIÓN PARA FILTROS - EJECUTAR EN CONSOLA DEL NAVEGADOR

console.clear()
console.log('🔧 DIAGNÓSTICO DE FILTROS - SERVICIOS')
console.log('='.repeat(50))

// 1. Verificar datos en localStorage
const serviciosData = localStorage.getItem('autoservice_servicios')
const vehiculosData = localStorage.getItem('autoservice_vehiculos') 
const clientesData = localStorage.getItem('autoservice_clientes')

console.log('📦 DATOS EN LOCALSTORAGE:')
console.log('Servicios:', serviciosData ? JSON.parse(serviciosData).length : 'NO DATOS')
console.log('Vehículos:', vehiculosData ? JSON.parse(vehiculosData).length : 'NO DATOS')
console.log('Clientes:', clientesData ? JSON.parse(clientesData).length : 'NO DATOS')

if (serviciosData && vehiculosData && clientesData) {
  const servicios = JSON.parse(serviciosData)
  const vehiculos = JSON.parse(vehiculosData)
  const clientes = JSON.parse(clientesData)
  
  console.log('\n🚗 VEHÍCULOS DISPONIBLES:')
  vehiculos.forEach(vehiculo => {
    console.log(`ID: ${vehiculo.id} | ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.patente} | Cliente: ${vehiculo.clienteId}`)
  })
  
  console.log('\n🔧 SERVICIOS Y SUS VEHÍCULOS:')
  servicios.forEach(servicio => {
    const vehiculo = vehiculos.find(v => v.id === servicio.vehiculoId)
    const cliente = clientes.find(c => c.id === servicio.clienteId)
    
    console.log(`Servicio ID: ${servicio.id}`)
    console.log(`  └─ Vehículo ID: ${servicio.vehiculoId}`)
    console.log(`  └─ Vehículo: ${vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.patente}` : '❌ NO ENCONTRADO'}`)
    console.log(`  └─ Cliente ID: ${servicio.clienteId}`)
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
  })
  
  if (problemasEncontrados === 0) {
    console.log('✅ No se encontraron problemas de consistencia')
  } else {
    console.log(`❌ Se encontraron ${problemasEncontrados} problemas`)
  }

  // Sugerir Ford Focus para prueba
  const fordFocus = vehiculos.find(v => v.marca.toLowerCase() === 'ford' && v.modelo.toLowerCase() === 'focus')
  if (fordFocus) {
    console.log('\n🎯 PRUEBA SUGERIDA:')
    console.log(`Selecciona el vehículo ID: ${fordFocus.id} (${fordFocus.marca} ${fordFocus.modelo} - ${fordFocus.patente})`)
    
    const serviciosFord = servicios.filter(s => s.vehiculoId === fordFocus.id)
    console.log(`Servicios esperados para este vehículo: ${serviciosFord.length}`)
    serviciosFord.forEach(s => {
      console.log(`  - ${s.tipoServicio} (${s.fechaServicio})`)
    })
  }

} else {
  console.log('❌ Faltan datos en localStorage')
  console.log('💡 Intenta cargar datos demo desde la configuración')
}

console.log('\n🔧 COMANDOS ÚTILES:')
console.log('localStorage.clear() // Limpiar todos los datos')
console.log('location.reload()    // Recargar página')
