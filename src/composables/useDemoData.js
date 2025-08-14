import { useAutoService } from './useAutoService'
import { useOrdenes } from './useOrdenes'

export const useDemoData = () => {
  const { agregarCliente, agregarVehiculo, agregarServicio } = useAutoService()
  const { crearOrden } = useOrdenes()

  const cargarDatosDemo = () => {
    // Datos de ejemplo de clientes
    const clientesDemo = [
      {
        nombre: 'Juan Pérez',
        email: 'juan.perez@email.com',
        telefono: '11-4567-8901',
        direccion: 'Av. Corrientes 1234, CABA',
        notas: 'Cliente frecuente desde 2020'
      },
      {
        nombre: 'María González',
        email: 'maria.gonzalez@email.com',
        telefono: '11-2345-6789',
        direccion: 'Calle Falsa 456, Belgrano',
        notas: 'Prefiere citas por la mañana'
      },
      {
        nombre: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@email.com',
        telefono: '11-9876-5432',
        direccion: 'San Martín 789, Palermo',
        notas: 'Mantenimiento preventivo cada 6 meses'
      },
      {
        nombre: 'Ana López',
        email: 'ana.lopez@email.com',
        telefono: '11-5555-1234',
        direccion: 'Rivadavia 321, Caballito',
        notas: 'Cliente corporativo'
      }
    ]

    // Crear clientes
    const clientesCreados = clientesDemo.map(cliente => agregarCliente(cliente))

    // Datos de ejemplo de vehículos
    const vehiculosDemo = [
      {
        clienteId: clientesCreados[0].id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2020,
        color: 'Blanco',
        kilometraje: 45000,
        numeroMotor: '4AG123456789',
        numeroChasis: 'JT2ABC12345678901'
      },
      {
        clienteId: clientesCreados[1].id,
        patente: 'DEF456',
        marca: 'Ford',
        modelo: 'Focus',
        anio: 2019,
        color: 'Azul',
        kilometraje: 62000,
        numeroMotor: '2.0L987654321',
        numeroChasis: 'WF0DEF45678901234'
      },
      {
        clienteId: clientesCreados[2].id,
        patente: 'GHI789',
        marca: 'Chevrolet',
        modelo: 'Cruze',
        anio: 2021,
        color: 'Negro',
        kilometraje: 28000,
        numeroMotor: '1.4T456789123',
        numeroChasis: '3G1GHI78901234567'
      },
      {
        clienteId: clientesCreados[2].id,
        patente: 'JKL012',
        marca: 'Volkswagen',
        modelo: 'Golf',
        anio: 2018,
        color: 'Rojo',
        kilometraje: 75000,
        numeroMotor: 'TSI789123456',
        numeroChasis: 'WVWJKL01234567890'
      },
      {
        clienteId: clientesCreados[3].id,
        patente: 'MNO345',
        marca: 'Honda',
        modelo: 'Civic',
        anio: 2022,
        color: 'Gris',
        kilometraje: 15000,
        numeroMotor: 'VTEC321654987',
        numeroChasis: '2HGMNO34567890123'
      }
    ]

    // Crear vehículos
    const vehiculosCreados = vehiculosDemo.map(vehiculo => agregarVehiculo(vehiculo))

    // Datos de ejemplo de servicios
    const serviciosDemo = [
      {
        vehiculoId: vehiculosCreados[0].id,
        clienteId: clientesCreados[0].id,
        tipoServicio: 'Cambio de aceite',
        fechaServicio: '2024-01-15',
        estado: 'completado',
        costo: 8500,
        kilometrajeActual: 42000,
        proximoServicio: '2024-07-15',
        descripcion: 'Cambio de aceite y filtro, revisión general',
        observaciones: 'Todo en buen estado'
      },
      {
        vehiculoId: vehiculosCreados[0].id,
        clienteId: clientesCreados[0].id,
        tipoServicio: 'Revisión general',
        fechaServicio: '2024-07-20',
        estado: 'completado',
        costo: 15000,
        kilometrajeActual: 45000,
        proximoServicio: '2025-01-20',
        descripcion: 'Service completo de 45.000 km',
        observaciones: 'Recomendado cambio de pastillas de freno próximamente'
      },
      {
        vehiculoId: vehiculosCreados[1].id,
        clienteId: clientesCreados[1].id,
        tipoServicio: 'Reparación de frenos',
        fechaServicio: '2024-03-10',
        estado: 'completado',
        costo: 25000,
        kilometrajeActual: 60000,
        proximoServicio: '2024-09-10',
        descripcion: 'Cambio de pastillas y discos delanteros',
        observaciones: 'Frenos traseros en buen estado'
      },
      {
        vehiculoId: vehiculosCreados[2].id,
        clienteId: clientesCreados[2].id,
        tipoServicio: 'Mantenimiento preventivo',
        fechaServicio: '2024-06-05',
        estado: 'completado',
        costo: 12000,
        kilometrajeActual: 26000,
        proximoServicio: '2024-12-05',
        descripcion: 'Service de 25.000 km',
        observaciones: 'Vehículo en excelente estado'
      },
      {
        vehiculoId: vehiculosCreados[3].id,
        clienteId: clientesCreados[2].id,
        tipoServicio: 'Cambio de neumáticos',
        fechaServicio: '2024-04-20',
        estado: 'completado',
        costo: 45000,
        kilometrajeActual: 73000,
        proximoServicio: '2024-10-20',
        descripcion: 'Cambio de 4 neumáticos y alineación',
        observaciones: 'Neumáticos anteriores muy desgastados'
      },
      {
        vehiculoId: vehiculosCreados[4].id,
        clienteId: clientesCreados[3].id,
        tipoServicio: 'Diagnóstico',
        fechaServicio: '2024-07-15',
        estado: 'en_progreso',
        costo: 3500,
        kilometrajeActual: 15000,
        descripcion: 'Diagnóstico de luz de check engine',
        observaciones: 'Pendiente de repuestos'
      },
      {
        vehiculoId: vehiculosCreados[1].id,
        clienteId: clientesCreados[1].id,
        tipoServicio: 'Cambio de aceite',
        fechaServicio: '2024-07-12',
        estado: 'completado',
        costo: 9000,
        kilometrajeActual: 62000,
        proximoServicio: '2025-01-12',
        descripcion: 'Cambio de aceite sintético y filtros',
        observaciones: 'Próximo service a los 70.000 km'
      }
    ]

    // Crear servicios con logging para verificar
    console.log('✅ Creando servicios...')
    serviciosDemo.forEach((servicio, index) => {
      const vehiculo = vehiculosCreados.find(v => v.id === servicio.vehiculoId)
      const cliente = clientesCreados.find(c => c.id === servicio.clienteId)
      console.log(`  ${index + 1}: ${servicio.tipoServicio} | ${vehiculo?.marca} ${vehiculo?.modelo} | Cliente: ${cliente?.nombre}`)
      agregarServicio(servicio)
    })

    // Datos de ejemplo de órdenes de mantenimiento
    const ordenesDemo = [
      {
        vehiculoId: vehiculosCreados[0].id, // Toyota Corolla
        clienteId: clientesCreados[0].id,   // Juan Pérez
        estado: 'pendiente',
        prioridad: 'alta',
        fechaVencimiento: '2024-08-15',
        costoEstimado: 25000,
        descripcionTrabajo: 'Cambio de pastillas de freno delanteras y traseras. Revisión completa del sistema de frenos.',
        observaciones: 'Cliente reporta ruido al frenar'
      },
      {
        vehiculoId: vehiculosCreados[1].id, // Ford Focus
        clienteId: clientesCreados[1].id,   // María González
        estado: 'en_proceso',
        prioridad: 'media',
        fechaVencimiento: '2024-08-20',
        costoEstimado: 18000,
        descripcionTrabajo: 'Service de 60.000 km: cambio de aceite, filtros, bujías y revisión general.',
        observaciones: 'Vehículo en taller desde el 15/07'
      },
      {
        vehiculoId: vehiculosCreados[2].id, // Chevrolet Cruze
        clienteId: clientesCreados[2].id,   // Carlos Rodríguez
        estado: 'completada',
        prioridad: 'baja',
        fechaVencimiento: '2024-07-10',
        costoEstimado: 8500,
        descripcionTrabajo: 'Cambio de aceite y filtro de aire.',
        observaciones: 'Trabajo completado satisfactoriamente'
      },
      {
        vehiculoId: vehiculosCreados[3].id, // Volkswagen Golf
        clienteId: clientesCreados[2].id,   // Carlos Rodríguez
        estado: 'pendiente',
        prioridad: 'urgente',
        fechaVencimiento: '2024-07-30',
        costoEstimado: 35000,
        descripcionTrabajo: 'Reparación de caja de cambios. Revisión completa del sistema de transmisión.',
        observaciones: 'Vehículo con problemas de cambio'
      },
      {
        vehiculoId: vehiculosCreados[4].id, // Honda Civic
        clienteId: clientesCreados[3].id,   // Ana López
        estado: 'pendiente',
        prioridad: 'media',
        fechaVencimiento: '2024-08-25',
        costoEstimado: 12000,
        descripcionTrabajo: 'Alineación y balanceo. Revisión de dirección.',
        observaciones: 'Vehículo nuevo, mantenimiento preventivo'
      }
    ]

    // Crear órdenes
    ordenesDemo.forEach(orden => crearOrden(orden))

    console.log('🎉 DATOS DEMO CORREGIDOS CARGADOS EXITOSAMENTE')
    console.log('📊 Resumen:')
    console.log(`  - ${clientesCreados.length} clientes`)
    console.log(`  - ${vehiculosCreados.length} vehículos`) 
    console.log(`  - ${serviciosDemo.length} servicios`)
    console.log(`  - ${ordenesDemo.length} órdenes`)
    
    console.log('\n🧪 PRUEBAS RECOMENDADAS:')
    console.log('  - Filtrar por "Ford Focus - DEF456" debería mostrar 3 servicios de María González')
    console.log('  - Filtrar por "Toyota Corolla - ABC123" debería mostrar 2 servicios de Juan Pérez')

    return {
      clientesCreados: clientesCreados.length,
      vehiculosCreados: vehiculosCreados.length,
      serviciosCreados: serviciosDemo.length,
      ordenesCreadas: ordenesDemo.length
    }
  }

  return {
    cargarDatosDemo
  }
}
