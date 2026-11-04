// click.self solo comprueba el destino del click. Al seleccionar texto, ese
// destino puede ser el fondo aunque el gesto haya empezado en un campo.
export const crearCierreFondo = (cerrar) => {
  let inicioEnFondo = false
  let finEnFondo = false
  let pointerId
  const reiniciar = () => { inicioEnFondo = false; finEnFondo = false; pointerId = undefined }
  return {
    iniciar(evento) {
      reiniciar()
      pointerId = evento.pointerId
      inicioEnFondo = evento.button === 0 && evento.target === evento.currentTarget
    },
    terminar(evento) {
      finEnFondo = evento.pointerId === pointerId && evento.button === 0 && evento.target === evento.currentTarget
    },
    cancelar: reiniciar,
    click(evento) {
      const cerrarPorFondo = inicioEnFondo && finEnFondo && evento.target === evento.currentTarget
      reiniciar()
      if (cerrarPorFondo) cerrar()
    }
  }
}
