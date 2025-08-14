// SCRIPT PARA LIMPIAR Y RECARGAR DATOS CORRECTOS
// Ejecutar en la consola del navegador

console.clear()
console.log('🔧 LIMPIANDO DATOS CORRUPTOS Y RECARGANDO...')

// 1. Limpiar localStorage
localStorage.clear()
console.log('✅ localStorage limpiado')

// 2. Recargar página para que se vuelvan a cargar los datos demo
console.log('🔄 Recargando página...')
setTimeout(() => {
  location.reload()
}, 1000)
