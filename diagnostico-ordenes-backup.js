// DIAGNÓSTICO DEL PROBLEMA DE ÓRDENES EN BACKUP

console.clear()
console.log('🔍 DIAGNÓSTICO PROBLEMA ÓRDENES EN BACKUP')
console.log('='.repeat(50))

// Verificar datos en localStorage
const ordenesAutoService = localStorage.getItem('autoservice_ordenes')
console.log('📦 Órdenes en localStorage:', ordenesAutoService ? JSON.parse(ordenesAutoService).length : 'NO DATOS')

// Verificar si hay dos sistemas diferentes
console.log('\n🔍 VERIFICANDO SISTEMAS DE ÓRDENES:')

// Sistema 1: useAutoService
try {
  const autoServiceData = localStorage.getItem('autoservice_ordenes')
  if (autoServiceData) {
    const ordenes1 = JSON.parse(autoServiceData)
    console.log('📋 Sistema useAutoService - Órdenes:', ordenes1.length)
    ordenes1.forEach((orden, index) => {
      console.log(`  ${index + 1}: ${orden.numeroOrden || orden.id} | Estado: ${orden.estado}`)
    })
  }
} catch (e) {
  console.log('❌ Error en sistema useAutoService:', e.message)
}

// Verificar el estado actual de la aplicación
console.log('\n🎯 ESTADO ACTUAL EN LA APLICACIÓN:')
// Esta parte necesitará ser ejecutada en la consola del navegador cuando la app esté cargada

console.log('\n💡 PROBLEMA IDENTIFICADO:')
console.log('- useAutoService.js tiene su propio ref(ordenes)')
console.log('- useOrdenes.js tiene su propio ref(ordenes) SEPARADO')
console.log('- El backup usa useAutoService pero la app usa useOrdenes')
console.log('- ¡Están DESCONECTADOS!')

console.log('\n🔧 SOLUCIÓN NECESARIA:')
console.log('1. Unificar los sistemas de órdenes')
console.log('2. Hacer que useOrdenes use el estado de useAutoService')
console.log('3. O hacer que el backup use ambos sistemas')
