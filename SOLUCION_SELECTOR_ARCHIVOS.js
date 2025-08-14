// FUNCIÓN CORREGIDA para reemplazar en ImageUploader.vue
// Línea aproximada 421 - función abrirSelectorArchivos

const abrirSelectorArchivos = () => {
  console.log('📁 Abriendo selector de archivos...')
  console.log('numeroOrden:', props.numeroOrden)
  
  if (!props.numeroOrden) {
    error('Debes seleccionar una orden primero')
    return
  }
  
  // Abrir selector INMEDIATAMENTE (los navegadores requieren que sea síncrono)
  console.log('📁 Ejecutando fileInput.click()...')
  if (fileInput.value) {
    fileInput.value.click()
    console.log('✅ fileInput.click() ejecutado')
  } else {
    console.error('❌ fileInput.value es null')
    error('Error interno: Selector de archivos no disponible')
  }
}
