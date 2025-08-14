import { useNotifications } from './useNotifications'

export function useWhatsApp() {
  const { success, error } = useNotifications()

  // Configuración del negocio (puedes moverlo a un archivo de config)
  const CONFIGURACION_NEGOCIO = {
    nombre: 'Servicio Automotriz', // Cambiar por el nombre real
    telefono: '5491123456789', // Cambiar por tu número real (formato: 54 + código de área + número)
    horarioAtencion: 'Lunes a Viernes 8:00-18:00hs',
    direccion: 'Dirección del taller' // Opcional
  }

  /**
   * Limpiar y formatear número de teléfono para WhatsApp
   */
  const formatearTelefono = (telefono) => {
    if (!telefono) return null
    
    // Remover caracteres no numéricos
    let numero = telefono.replace(/\D/g, '')
    
    // Si empieza con 0, quitarlo (típico de números argentinos)
    if (numero.startsWith('0')) {
      numero = numero.substring(1)
    }
    
    // Si no empieza con código de país, agregar Argentina (54)
    if (!numero.startsWith('54')) {
      // Si tiene 10 dígitos, es un número argentino sin código de país
      if (numero.length === 10) {
        numero = '54' + numero
      } else if (numero.length === 9) {
        // Celular argentino sin 0 inicial
        numero = '549' + numero
      }
    }
    
    return numero
  }

  /**
   * Crear enlace de WhatsApp
   */
  const crearEnlaceWhatsApp = (telefono, mensaje) => {
    const telefonoFormateado = formatearTelefono(telefono)
    if (!telefonoFormateado) {
      throw new Error('Número de teléfono inválido')
    }
    
    const mensajeCodificado = encodeURIComponent(mensaje)
    return `https://wa.me/${telefonoFormateado}?text=${mensajeCodificado}`
  }

  /**
   * Abrir WhatsApp en nueva ventana/app
   */
  const abrirWhatsApp = (telefono, mensaje) => {
    try {
      const enlace = crearEnlaceWhatsApp(telefono, mensaje)
      window.open(enlace, '_blank')
      success('WhatsApp abierto! 📱')
    } catch (err) {
      error(`Error al abrir WhatsApp: ${err.message}`)
    }
  }

  /**
   * Mensaje: Auto listo para recoger
   */
  const notificarAutoListo = (cliente, vehiculo, orden) => {
    const mensaje = `Hola ${cliente.nombre}! 👋

Tu ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente}) ya está listo! ✅

*Trabajo realizado:*
${orden.descripcionTrabajo}

*Total: $${orden.costoTotal?.toLocaleString() || orden.costoEstimado?.toLocaleString() || '0'}*

*Horario de atención:* ${CONFIGURACION_NEGOCIO.horarioAtencion}

¡Gracias por confiar en ${CONFIGURACION_NEGOCIO.nombre}! 🚗✨`

    abrirWhatsApp(cliente.telefono, mensaje)
  }

  /**
   * Mensaje: Solicitar fotos del trabajo
   */
  const compartirFotos = (cliente, vehiculo, mensaje = '') => {
    const textoMensaje = `Hola ${cliente.nombre}! 📸

Te enviamos las fotos del trabajo realizado en tu ${vehiculo.marca} ${vehiculo.modelo}.

${mensaje || 'Todo perfecto! ✨'}

¿Alguna consulta? Escribinos 📱

Saludos,
${CONFIGURACION_NEGOCIO.nombre}`

    abrirWhatsApp(cliente.telefono, textoMensaje)
  }

  /**
   * Mensaje: Recordatorio de próximo service
   */
  const recordatorioProximoService = (cliente, vehiculo, kilometraje, fechaSugerida = '') => {
    const mensaje = `Hola ${cliente.nombre}! 👋

Tu ${vehiculo.marca} ${vehiculo.modelo} está próximo al service de ${kilometraje?.toLocaleString()}km.

${fechaSugerida ? `📅 Fecha sugerida: ${fechaSugerida}` : '📅 ¿Coordinamos una fecha?'}

*Turnos disponibles esta semana*

*Horario:* ${CONFIGURACION_NEGOCIO.horarioAtencion}

${CONFIGURACION_NEGOCIO.nombre} 🔧`

    abrirWhatsApp(cliente.telefono, mensaje)
  }

  /**
   * Mensaje: Confirmación de turno
   */
  const confirmarTurno = (cliente, vehiculo, fecha, hora, servicio) => {
    const mensaje = `Hola ${cliente.nombre}! 📅

*Turno confirmado:*
• Vehículo: ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})
• Fecha: ${fecha}
• Hora: ${hora}
• Servicio: ${servicio}

*Dirección:* ${CONFIGURACION_NEGOCIO.direccion || 'Consultar dirección'}

Por favor confirma con un "👍" si puedes asistir.

${CONFIGURACION_NEGOCIO.nombre}`

    abrirWhatsApp(cliente.telefono, mensaje)
  }

  /**
   * Mensaje: Presupuesto
   */
  const enviarPresupuesto = (cliente, vehiculo, items, total) => {
    const itemsTexto = items.map(item => `• ${item.descripcion}: $${item.precio?.toLocaleString()}`).join('\n')
    
    const mensaje = `Hola ${cliente.nombre}! 💰

*Presupuesto para ${vehiculo.marca} ${vehiculo.modelo}:*

${itemsTexto}

*Total: $${total?.toLocaleString()}*

El presupuesto es válido por 15 días.

¿Aprobas el trabajo? Responde con "APROBADO" para continuar.

${CONFIGURACION_NEGOCIO.nombre}`

    abrirWhatsApp(cliente.telefono, mensaje)
  }

  /**
   * Mensaje: Estado del trabajo (en proceso)
   */
  const actualizarEstadoTrabajo = (cliente, vehiculo, estado, observaciones = '') => {
    const estadoTexto = {
      'pendiente': 'Tu vehículo está en la cola de trabajo 📋',
      'en_proceso': 'Estamos trabajando en tu vehículo 🔧',
      'esperando_repuestos': 'Esperando llegada de repuestos 📦',
      'esperando_autorizacion': 'Esperando tu autorización para continuar ⏳'
    }

    const mensaje = `Hola ${cliente.nombre}! 📢

*Actualización de tu ${vehiculo.marca} ${vehiculo.modelo}:*

${estadoTexto[estado] || estado}

${observaciones ? `*Observaciones:* ${observaciones}` : ''}

Te mantenemos informado!

${CONFIGURACION_NEGOCIO.nombre}`

    abrirWhatsApp(cliente.telefono, mensaje)
  }

  /**
   * Mensaje: Contacto rápido
   */
  const contactoRapido = (cliente) => {
    const mensaje = `Hola ${cliente.nombre}! 👋

¿En qué podemos ayudarte?

${CONFIGURACION_NEGOCIO.nombre}
${CONFIGURACION_NEGOCIO.horarioAtencion}`

    abrirWhatsApp(cliente.telefono, mensaje)
  }

  /**
   * Validar si el cliente tiene teléfono
   */
  const tieneWhatsApp = (cliente) => {
    return cliente && cliente.telefono && formatearTelefono(cliente.telefono)
  }

  return {
    // Funciones principales
    notificarAutoListo,
    compartirFotos,
    recordatorioProximoService,
    confirmarTurno,
    enviarPresupuesto,
    actualizarEstadoTrabajo,
    contactoRapido,
    
    // Funciones auxiliares
    abrirWhatsApp,
    crearEnlaceWhatsApp,
    formatearTelefono,
    tieneWhatsApp,
    
    // Configuración
    CONFIGURACION_NEGOCIO
  }
}
