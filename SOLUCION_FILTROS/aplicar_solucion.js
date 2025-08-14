// SCRIPT PARA APLICAR LA SOLUCIÓN DE FILTROS AUTOMÁTICAMENTE
// Este script puede ser ejecutado para corregir los problemas de filtros

console.log('🚀 APLICANDO SOLUCIÓN DE FILTROS...')

// 1. Crear backup del archivo actual
function crearBackup() {
  console.log('📁 Creando backup...')
  // Nota: Esto debe hacerse manualmente:
  // cp src/views/Servicios.vue src/views/Servicios_BACKUP_$(date +%Y%m%d_%H%M%S).vue
  console.log('⚠️ IMPORTANTE: Crear backup manualmente antes de continuar:')
  console.log('   cp src/views/Servicios.vue src/views/Servicios_BACKUP.vue')
}

// 2. Verificar problemas comunes de datos
function verificarDatos() {
  console.log('🔍 Verificando datos...')
  
  const servicios = JSON.parse(localStorage.getItem('autoservice_servicios') || '[]')
  const vehiculos = JSON.parse(localStorage.getItem('autoservice_vehiculos') || '[]')
  const clientes = JSON.parse(localStorage.getItem('autoservice_clientes') || '[]')
  
  let problemas = []
  
  // Verificar existencia de datos
  if (servicios.length === 0) problemas.push('No hay servicios')
  if (vehiculos.length === 0) problemas.push('No hay vehículos')
  if (clientes.length === 0) problemas.push('No hay clientes')
  
  // Verificar tipos de datos
  servicios.forEach(servicio => {
    if (typeof servicio.vehiculoId !== 'number') {
      problemas.push(`Servicio ${servicio.id}: vehiculoId no es número`)
    }
    if (typeof servicio.clienteId !== 'number') {
      problemas.push(`Servicio ${servicio.id}: clienteId no es número`)
    }
  })
  
  // Verificar referencias
  servicios.forEach(servicio => {
    const vehiculoExiste = vehiculos.find(v => v.id === servicio.vehiculoId)
    const clienteExiste = clientes.find(c => c.id === servicio.clienteId)
    
    if (!vehiculoExiste) {
      problemas.push(`Servicio ${servicio.id}: vehículo ${servicio.vehiculoId} no existe`)
    }
    
    if (!clienteExiste) {
      problemas.push(`Servicio ${servicio.id}: cliente ${servicio.clienteId} no existe`)
    }
  })
  
  if (problemas.length > 0) {
    console.log('❌ Problemas encontrados:')
    problemas.forEach(problema => console.log(`   - ${problema}`))
    return false
  } else {
    console.log('✅ Datos verificados correctamente')
    return true
  }
}

// 3. Corregir tipos de datos automáticamente
function corregirTiposDatos() {
  console.log('🔧 Corrigiendo tipos de datos...')
  
  const servicios = JSON.parse(localStorage.getItem('autoservice_servicios') || '[]')
  const vehiculos = JSON.parse(localStorage.getItem('autoservice_vehiculos') || '[]')
  const clientes = JSON.parse(localStorage.getItem('autoservice_clientes') || '[]')
  
  // Corregir servicios
  const serviciosCorregidos = servicios.map(servicio => ({
    ...servicio,
    id: parseInt(servicio.id),
    vehiculoId: parseInt(servicio.vehiculoId),
    clienteId: parseInt(servicio.clienteId),
    costo: parseFloat(servicio.costo || 0),
    kilometrajeActual: parseInt(servicio.kilometrajeActual || 0)
  }))
  
  // Corregir vehículos
  const vehiculosCorregidos = vehiculos.map(vehiculo => ({
    ...vehiculo,
    id: parseInt(vehiculo.id),
    clienteId: parseInt(vehiculo.clienteId),
    año: parseInt(vehiculo.año || new Date().getFullYear())
  }))
  
  // Corregir clientes
  const clientesCorregidos = clientes.map(cliente => ({
    ...cliente,
    id: parseInt(cliente.id)
  }))
  
  // Guardar datos corregidos
  localStorage.setItem('autoservice_servicios', JSON.stringify(serviciosCorregidos))
  localStorage.setItem('autoservice_vehiculos', JSON.stringify(vehiculosCorregidos))
  localStorage.setItem('autoservice_clientes', JSON.stringify(clientesCorregidos))
  
  console.log('✅ Tipos de datos corregidos')
}

// 4. Generar código corregido para Servicios.vue
function generarCodigoCorregido() {
  console.log('📝 Generando código corregido...')
  
  const codigoScript = `
// 🔧 SECCIÓN <script> CORREGIDA PARA FILTROS

// Variables de filtro (CORREGIDAS)
const filtroVehiculo = ref('')
const filtroCliente = ref('')
const filtroEstado = ref('')
const filtroTexto = ref('') // Directo, sin debounce

// Computed de filtros (CORREGIDO)
const serviciosFiltrados = computed(() => {
  console.log('🔍 Filtrando servicios...')
  
  let resultado = servicios.value.map(servicio => ({
    ...servicio,
    vehiculo: obtenerVehiculoPorId(servicio.vehiculoId),
    cliente: obtenerClientePorId(servicio.clienteId)
  }))

  // Filtro por texto - EXPANDIDO
  if (filtroTexto.value && filtroTexto.value.trim() !== '') {
    const filtro = filtroTexto.value.toLowerCase().trim()
    
    resultado = resultado.filter(servicio => {
      return (
        servicio.tipoServicio?.toLowerCase().includes(filtro) ||
        servicio.descripcion?.toLowerCase().includes(filtro) ||
        servicio.observaciones?.toLowerCase().includes(filtro) ||
        servicio.vehiculo?.marca?.toLowerCase().includes(filtro) ||
        servicio.vehiculo?.modelo?.toLowerCase().includes(filtro) ||
        servicio.vehiculo?.patente?.toLowerCase().includes(filtro) ||
        servicio.cliente?.nombre?.toLowerCase().includes(filtro)
      )
    })
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

  // Filtro por estado
  if (filtroEstado.value && filtroEstado.value !== '') {
    resultado = resultado.filter(servicio => 
      servicio.estado === filtroEstado.value
    )
  }

  return resultado.sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio))
})

// Función para limpiar filtros (NUEVA)
const limpiarFiltros = () => {
  filtroTexto.value = ''
  filtroVehiculo.value = ''
  filtroCliente.value = ''
  filtroEstado.value = ''
}
`
  
  const codigoTemplate = `
<!-- 🔧 SECCIÓN TEMPLATE CORREGIDA PARA FILTROS -->

<!-- Input de búsqueda CORREGIDO -->
<input
  v-model="filtroTexto"
  type="text"
  placeholder="Buscar por tipo de servicio..."
  class="input-field pl-10"
/>

<!-- Selects de filtro con handlers -->
<select v-model="filtroVehiculo" class="input-field">
  <option value="">Todos los vehículos</option>
  <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
    {{ vehiculo.marca }} {{ vehiculo.modelo }} - {{ vehiculo.patente }}
  </option>
</select>

<!-- Contador de resultados y botón limpiar -->
<div class="mt-4 flex justify-between items-center text-sm text-gray-600">
  <div class="flex items-center gap-4">
    <span>Mostrando {{ serviciosFiltrados.length }} de {{ servicios.length }} servicios</span>
    <button 
      v-if="hayFiltros"
      @click="limpiarFiltros"
      class="text-blue-600 hover:text-blue-800 text-sm"
    >
      Limpiar filtros
    </button>
  </div>
</div>
`
  
  console.log('📋 CÓDIGO PARA EL SCRIPT:')
  console.log(codigoScript)
  
  console.log('📋 CÓDIGO PARA EL TEMPLATE:')
  console.log(codigoTemplate)
}

// 5. Instrucciones de aplicación manual
function mostrarInstrucciones() {
  console.log('📖 INSTRUCCIONES DE APLICACIÓN:')
  console.log('')
  console.log('1. 📁 CREAR BACKUP:')
  console.log('   cp src/views/Servicios.vue src/views/Servicios_BACKUP.vue')
  console.log('')
  console.log('2. 🔧 APLICAR SOLUCIÓN AUTOMÁTICA:')
  console.log('   cp SOLUCION_FILTROS/Servicios_CORREGIDO.vue src/views/Servicios.vue')
  console.log('')
  console.log('3. 🔧 O APLICAR MANUALMENTE:')
  console.log('   - Abrir src/views/Servicios.vue')
  console.log('   - Reemplazar las secciones indicadas arriba')
  console.log('')
  console.log('4. 🧪 VERIFICAR FUNCIONAMIENTO:')
  console.log('   - Abrir DevTools (F12)')
  console.log('   - Ir a la pestaña Servicios')
  console.log('   - Probar cada filtro individualmente')
  console.log('   - Verificar logs en consola')
  console.log('')
  console.log('5. 🎯 CASOS DE PRUEBA:')
  console.log('   a) Buscar "aceite" en el campo de texto')
  console.log('   b) Seleccionar un vehículo específico')
  console.log('   c) Seleccionar un cliente específico')
  console.log('   d) Seleccionar estado "Completado"')
  console.log('   e) Combinar múltiples filtros')
  console.log('   f) Hacer clic en "Limpiar filtros"')
}

// 6. Función principal
function aplicarSolucion() {
  console.log('🚀 INICIANDO APLICACIÓN DE SOLUCIÓN...')
  console.log('')
  
  // Paso 1: Crear backup
  crearBackup()
  
  // Paso 2: Verificar datos
  const datosOK = verificarDatos()
  
  if (!datosOK) {
    console.log('❌ DATOS CON PROBLEMAS')
    console.log('💡 Ejecuta: corregirTiposDatos() para corregir automáticamente')
    console.log('💡 O ejecuta: localStorage.clear(); location.reload() y carga datos demo')
    return
  }
  
  // Paso 3: Mostrar código corregido
  generarCodigoCorregido()
  
  // Paso 4: Mostrar instrucciones
  mostrarInstrucciones()
  
  console.log('')
  console.log('✅ SOLUCIÓN LISTA PARA APLICAR')
  console.log('📁 Archivos disponibles en: SOLUCION_FILTROS/')
  console.log('📖 Documentación: SOLUCION_FILTROS/README_SOLUCION.md')
}

// Ejecutar solución principal
aplicarSolucion()

// Funciones helper disponibles:
console.log('')
console.log('🛠️ FUNCIONES DISPONIBLES:')
console.log('- verificarDatos()           // Verificar integridad de datos')
console.log('- corregirTiposDatos()       // Corregir tipos automáticamente')
console.log('- generarCodigoCorregido()   // Ver código corregido')
console.log('- mostrarInstrucciones()     // Ver instrucciones detalladas')
console.log('- aplicarSolucion()          // Ejecutar proceso completo')
