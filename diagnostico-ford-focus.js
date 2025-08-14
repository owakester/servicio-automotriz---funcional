// DIAGNÓSTICO ESPECÍFICO PARA EL PROBLEMA DEL FILTRO FORD FOCUS
// Ejecutar en la consola del navegador mientras se ve el filtro fallando

console.clear()
console.log('🚨 DIAGNÓSTICO ESPECÍFICO - FILTRO FORD FOCUS')
console.log('='.repeat(60))

// 1. Verificar qué hay en el select del filtro
const selectVehiculos = document.querySelector('select')
if (selectVehiculos) {
  console.log('📋 OPCIONES EN EL SELECT DE VEHÍCULOS:')
  Array.from(selectVehiculos.options).forEach((option, index) => {
    if (option.value) {
      console.log(`${index}: value="${option.value}" | text="${option.text}"`)
    }
  })
  
  console.log(`\n🎯 VALOR ACTUAL SELECCIONADO: "${selectVehiculos.value}"`)
  
  // Verificar si hay Ford Focus
  const fordOption = Array.from(selectVehiculos.options).find(opt => 
    opt.text.toLowerCase().includes('ford') && opt.text.toLowerCase().includes('focus')
  )
  
  if (fordOption) {
    console.log(`✅ Ford Focus encontrado: value="${fordOption.value}" | text="${fordOption.text}"`)
  } else {
    console.log('❌ No se encontró opción de Ford Focus en el select')
  }
}

// 2. Verificar datos en localStorage
const serviciosData = localStorage.getItem('autoservice_servicios')
const vehiculosData = localStorage.getItem('autoservice_vehiculos')

if (serviciosData && vehiculosData) {
  const servicios = JSON.parse(serviciosData)
  const vehiculos = JSON.parse(vehiculosData)
  
  console.log('\n🚗 TODOS LOS VEHÍCULOS EN DATOS:')
  vehiculos.forEach(vehiculo => {
    console.log(`ID: ${vehiculo.id} | ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.patente}`)
  })
  
  // Buscar Ford Focus específicamente
  const fordFocus = vehiculos.find(v => 
    v.marca.toLowerCase().includes('ford') && v.modelo.toLowerCase().includes('focus')
  )
  
  if (fordFocus) {
    console.log(`\n🎯 FORD FOCUS ENCONTRADO:`)
    console.log(`ID: ${fordFocus.id}`)
    console.log(`Marca: ${fordFocus.marca}`)
    console.log(`Modelo: ${fordFocus.modelo}`)
    console.log(`Patente: ${fordFocus.patente}`)
    
    // Buscar servicios de este Ford Focus
    const serviciosFord = servicios.filter(s => s.vehiculoId === fordFocus.id)
    console.log(`\n🔧 SERVICIOS DEL FORD FOCUS (ID ${fordFocus.id}):`)
    
    if (serviciosFord.length > 0) {
      serviciosFord.forEach(s => {
        console.log(`- Servicio ID: ${s.id} | Tipo: ${s.tipoServicio} | Fecha: ${s.fechaServicio}`)
      })
    } else {
      console.log('❌ NO HAY SERVICIOS PARA EL FORD FOCUS')
      console.log('💡 Esto explica por qué no aparece nada cuando filtras')
    }
    
    // Verificar si el valor del select coincide con el ID del Ford Focus
    if (selectVehiculos && selectVehiculos.value == fordFocus.id) {
      console.log(`✅ El filtro está correctamente seleccionado (${selectVehiculos.value} = ${fordFocus.id})`)
    } else if (selectVehiculos) {
      console.log(`❌ PROBLEMA: Filtro seleccionado="${selectVehiculos.value}" pero Ford Focus ID="${fordFocus.id}"`)
    }
    
  } else {
    console.log('\n❌ NO SE ENCONTRÓ FORD FOCUS EN LOS DATOS')
    console.log('💡 El vehículo Ford Focus no existe en la base de datos')
  }
  
  // Verificar servicios que se están mostrando
  console.log('\n📊 TODOS LOS SERVICIOS:')
  servicios.forEach(servicio => {
    const vehiculo = vehiculos.find(v => v.id === servicio.vehiculoId)
    console.log(`Servicio ID: ${servicio.id} | Vehículo ID: ${servicio.vehiculoId} | ${vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : 'VEHÍCULO NO ENCONTRADO'}`)
  })
  
} else {
  console.log('❌ No hay datos en localStorage')
}

console.log('\n💡 POSIBLES SOLUCIONES:')
console.log('1. Si no hay servicios para Ford Focus: Crear servicios manualmente')
console.log('2. Si no existe Ford Focus: Verificar datos demo o crear vehículo')
console.log('3. Si hay problema de IDs: Limpiar localStorage y recargar datos')
console.log('\n🔧 COMANDOS:')
console.log('localStorage.clear(); location.reload() // Resetear todo')
