import { useNotifications } from './useNotifications'
import { formatearFecha } from '../utils/dates'
import { formatearDniCuil } from '../utils/clientIdentity'

export const usePDF = () => {
  const { success, error } = useNotifications()

  // Generar PDF de orden de mantenimiento
  const generarPDFOrden = (orden) => {
    try {
      // Crear contenido HTML para el PDF
      const contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Orden de Mantenimiento ${orden.numeroOrden}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
              margin-bottom: 20px; 
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              color: #2563eb; 
              margin-bottom: 5px; 
            }
            .order-number { 
              font-size: 18px; 
              font-weight: bold; 
              color: #dc2626; 
              margin-bottom: 10px; 
            }
            .section { 
              margin: 20px 0; 
              padding: 15px; 
              border: 1px solid #ddd; 
              border-radius: 5px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              color: #374151; 
              margin-bottom: 10px; 
              border-bottom: 1px solid #e5e7eb; 
              padding-bottom: 5px; 
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin-bottom: 15px; 
            }
            .info-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 5px 0; 
            }
            .info-label { 
              font-weight: bold; 
              color: #4b5563; 
            }
            .info-value { 
              color: #111827; 
            }
            .status { 
              display: inline-block; 
              padding: 5px 10px; 
              border-radius: 15px; 
              font-size: 12px; 
              font-weight: bold; 
              text-transform: uppercase; 
            }
            .status-pendiente { 
              background-color: #fef3c7; 
              color: #d97706; 
            }
            .status-en_proceso { 
              background-color: #dbeafe; 
              color: #2563eb; 
            }
            .status-completada { 
              background-color: #d1fae5; 
              color: #059669; 
            }
            .status-cancelada { 
              background-color: #fee2e2; 
              color: #dc2626; 
            }
            .priority { 
              display: inline-block; 
              padding: 3px 8px; 
              border-radius: 10px; 
              font-size: 11px; 
              font-weight: bold; 
            }
            .priority-baja { 
              background-color: #f3f4f6; 
              color: #6b7280; 
            }
            .priority-media { 
              background-color: #fef3c7; 
              color: #d97706; 
            }
            .priority-alta { 
              background-color: #fed7c3; 
              color: #ea580c; 
            }
            .priority-urgente { 
              background-color: #fee2e2; 
              color: #dc2626; 
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              text-align: center; 
              color: #6b7280; 
              font-size: 12px; 
            }
            .trabajo-detalle {
              background-color: #f9fafb;
              padding: 15px;
              border-radius: 5px;
              margin-top: 10px;
              white-space: pre-wrap;
            }
            @media print {
              body { margin: 0; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">AutoService Pro</div>
            <div class="order-number">Orden de Mantenimiento: ${orden.numeroOrden}</div>
            <div style="color: #6b7280; font-size: 14px;">
              Fecha: ${formatearFecha(orden.fechaCreacion)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Información del Cliente</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Nombre:</span>
                <span class="info-value">${orden.cliente?.nombre || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">DNI/CUIL:</span>
                <span class="info-value">${formatearDniCuil(orden.cliente?.dniCuil) || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Teléfono:</span>
                <span class="info-value">${orden.cliente?.telefono || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${orden.cliente?.email || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Dirección:</span>
                <span class="info-value">${orden.cliente?.direccion || 'No especificado'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Información del Vehículo</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Marca/Modelo:</span>
                <span class="info-value">${orden.vehiculo?.marca || ''} ${orden.vehiculo?.modelo || ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Patente:</span>
                <span class="info-value">${orden.vehiculo?.patente || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Año:</span>
                <span class="info-value">${orden.vehiculo?.anio || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Color:</span>
                <span class="info-value">${orden.vehiculo?.color || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Kilometraje:</span>
                <span class="info-value">${orden.vehiculo?.kilometraje?.toLocaleString() || 'No especificado'} km</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Detalles de la Orden</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="status status-${orden.estado}">${formatearEstado(orden.estado)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Prioridad:</span>
                <span class="priority priority-${orden.prioridad}">${formatearPrioridad(orden.prioridad)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fecha de Vencimiento:</span>
                <span class="info-value">${orden.fechaVencimiento ? formatearFecha(orden.fechaVencimiento) : 'Sin fecha límite'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Costo Estimado:</span>
                <span class="info-value">$${orden.costoEstimado?.toLocaleString() || 'No especificado'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Trabajo a Realizar</div>
            <div class="trabajo-detalle">${orden.descripcionTrabajo || 'No especificado'}</div>
          </div>

          ${orden.observaciones ? `
          <div class="section">
            <div class="section-title">Observaciones</div>
            <div class="trabajo-detalle">${orden.observaciones}</div>
          </div>
          ` : ''}

          <div class="footer">
            <p>AutoService Pro - Sistema de Gestión Automotriz</p>
            <p>Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
          </div>
        </body>
        </html>
      `

      // Crear ventana para impresión/descarga
      const ventanaImpresion = window.open('', '_blank', 'width=800,height=600')
      
      if (ventanaImpresion) {
        ventanaImpresion.document.write(contenidoHTML)
        ventanaImpresion.document.close()

        // Esperar a que se cargue y luego hacer disponible para imprimir
        setTimeout(() => {
          ventanaImpresion.focus()
          // Opcional: auto-imprimir
          // ventanaImpresion.print()
        }, 500)
      } else {
        // Si se bloquea el popup, descargar como archivo
        const blob = new Blob([contenidoHTML], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${orden.numeroOrden}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      success(`PDF de orden ${orden.numeroOrden} generado`)
      return contenidoHTML

    } catch (err) {
      console.error('Error al generar PDF:', err)
      error('Error al generar el PDF')
      return null
    }
  }

  // Funciones auxiliares para formatear
  const formatearEstado = (estado) => {
    const estados = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    }
    return estados[estado] || estado
  }

  const formatearPrioridad = (prioridad) => {
    const prioridades = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'urgente': 'Urgente'
    }
    return prioridades[prioridad] || prioridad
  }

  return {
    generarPDFOrden
  }
}
