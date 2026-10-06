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
    .filter((elemento) => !elemento.hasAttribute('hidden') && elemento.offsetParent !== null)

export const focusTrap = {
  mounted(elemento) {
    const manejarTeclado = (evento) => {
      if (evento.key !== 'Tab') return
      const elementos = obtenerElementos(elemento)
      if (elementos.length === 0) {
        evento.preventDefault()
        elemento.focus()
        return
      }

      const primero = elementos[0]
      const ultimo = elementos[elementos.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    elemento.__focusTrapHandler = manejarTeclado
    elemento.addEventListener('keydown', manejarTeclado)
  },
  unmounted(elemento) {
    elemento.removeEventListener('keydown', elemento.__focusTrapHandler)
    delete elemento.__focusTrapHandler
  }
}
