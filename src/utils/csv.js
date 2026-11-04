// Un único escape para Configuración y Reportes, incluidos campos multilínea.
export const escaparCSV = (valor) => {
  let texto = valor == null ? '' : String(valor)
  // Evita fórmulas al abrir datos ingresados por usuarios en Excel/Sheets.
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`
  return `"${texto.replace(/"/g, '""')}"`
}

export const crearCSV = (encabezados, filas) => '\uFEFF' + [
  encabezados.map(escaparCSV).join(','),
  ...filas.map(fila => fila.map(escaparCSV).join(','))
].join('\r\n')
