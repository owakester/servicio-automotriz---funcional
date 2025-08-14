// VERIFICACIÓN FINAL - EJECUTAR EN CONSOLA PARA CONFIRMAR QUE TODO ESTÁ BIEN

console.clear()
console.log('🔍 VERIFICACIÓN FINAL DEL FILTRO')
console.log('='.repeat(40))

// Verificar datos actuales
const serviciosData = localStorage.getItem('autoservice_servicios')
const vehiculosData = localStorage.getItem('autoservice_vehiculos')
const clientesData = localStorage.getItem('autoservice_clientes')

if (serviciosData && vehiculosData && clientesData) {
  const servicios = JSON.parse(serviciosData)
  const vehiculos = JSON.parse(vehiculosData)
  const clientes = JSON.parse(clientesData)

  // Buscar Ford Focus
  const fordFocus = vehiculos.find(v => 
    v.marca.toLowerCase().includes('ford') && v.modelo.toLowerCase().includes('focus')
  )

  if (fordFocus) {
    console.log('🚗 FORD FOCUS ENCONTRADO:')
    console.log(`ID: ${fordFocus.id}`)
    console.log(`Vehículo: ${fordFocus.marca} ${fordFocus.modelo} - ${fordFocus.patente}`)
    console.log(`Cliente ID: ${fordFocus.clienteId}`)
    
    const clienteFord = clientes.find(c => c.id === fordFocus.clienteId)
    console.log(`Cliente: ${clienteFord ? clienteFord.nombre : 'NO ENCONTRADO'}`)
    
    // Buscar servicios del Ford Focus
    const serviciosFord = servicios.filter(s => s.vehiculoId === fordFocus.id)
    console.log(`\n🔧 SERVICIOS DEL FORD FOCUS (${serviciosFord.length}):`)
    
    serviciosFord.forEach(servicio => {
      const cliente = clientes.find(c => c.id === servicio.clienteId)
      console.log(`- ${servicio.tipoServicio} | Cliente: ${cliente ? cliente.nombre : 'NO ENCONTRADO'} | Fecha: ${servicio.fechaServicio}`)
    })
    
    // Verificar Toyota Corolla para comparar
    console.log('\n🚗 COMPARACIÓN - TOYOTA COROLLA:')
    const toyotaCorolla = vehiculos.find(v => 
      v.marca.toLowerCase().includes('toyota') && v.modelo.toLowerCase().includes('corolla')
    )
    
    if (toyotaCorolla) {
      console.log(`Toyota ID: ${toyotaCorolla.id}`)
      console.log(`Cliente ID Toyota: ${toyotaCorolla.clienteId}`)
      
      const clienteToyota = clientes.find(c => c.id === toyotaCorolla.clienteId)
      console.log(`Cliente Toyota: ${clienteToyota ? clienteToyota.nombre : 'NO ENCONTRADO'}`)
      
      const serviciosToyota = servicios.filter(s => s.vehiculoId === toyotaCorolla.id)
      console.log(`Servicios Toyota: ${serviciosToyota.length}`)
    }
    
  } else {
    console.log('❌ Ford Focus no encontrado')
  }
  
  console.log('\n📊 RESUMEN:')
  console.log(`Total vehículos: ${vehiculos.length}`)
  console.log(`Total servicios: ${servicios.length}`)
  console.log(`Total clientes: ${clientes.length}`)
  
} else {
  console.log('❌ No hay datos en localStorage')
}

// Verificar el filtro actual en la página
const selectVehiculos = document.querySelector('select')
if (selectVehiculos) {
  console.log(`\n🎯 FILTRO ACTUAL: "${selectVehiculos.value}"`)
  const opcionSeleccionada = selectVehiculos.options[selectVehiculos.selectedIndex]
  console.log(`Texto: "${opcionSeleccionada.text}"`)
}
