const SELECTOR_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const obtenerElementos = (contenedor) =>
  [...contenedor.querySelectorAll(SELECTOR_FOCUSABLE)]
    .filter((elemento) => !elemento.matches(':disabled, [tabindex="-1"]') && !elemento.closest('[hidden], [inert]') && elemento.getClientRects().length > 0)

// Solo el diálogo superior controla Tab (también admite diálogos anidados).
const dialogos = []

export const focusTrap = {
  mounted(elemento) {
    const focoAnterior = document.activeElement
    dialogos.push(elemento)
    const enfocarInicio = () => {
      const elementos = obtenerElementos(elemento)
      ;(elementos.find(e => e.hasAttribute('autofocus')) || elementos[0] || elemento).focus()
    }
    queueMicrotask(() => {
      if (dialogos.at(-1) === elemento && !elemento.contains(document.activeElement)) enfocarInicio()
    })
    const manejarTeclado = (evento) => {
      if (evento.key !== 'Tab' || dialogos.at(-1) !== elemento) return
      const elementos = obtenerElementos(elemento)
      if (elementos.length === 0) {
        evento.preventDefault()
        elemento.focus()
        return
      }

      const primero = elementos[0]
      const ultimo = elementos[elementos.length - 1]
      if (!elementos.includes(document.activeElement)) {
        evento.preventDefault()
        ;(evento.shiftKey ? ultimo : primero).focus()
      } else if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    elemento.__focusTrapHandler = manejarTeclado
    elemento.__focusTrapPrevious = focoAnterior
    document.addEventListener('keydown', manejarTeclado)
  },
  unmounted(elemento) {
    const eraSuperior = dialogos.at(-1) === elemento
    const index = dialogos.indexOf(elemento)
    if (index >= 0) dialogos.splice(index, 1)
    document.removeEventListener('keydown', elemento.__focusTrapHandler)
    const anterior = elemento.__focusTrapPrevious
    if (eraSuperior && anterior?.isConnected && (!dialogos.length || dialogos.at(-1).contains(anterior))) anterior.focus()
    delete elemento.__focusTrapHandler
    delete elemento.__focusTrapPrevious
  }
}
