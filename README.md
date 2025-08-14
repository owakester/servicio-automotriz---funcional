# 🚗 AutoService Pro

Sistema de gestión integral para talleres automotrices desarrollado con Vue.js 3 y Tailwind CSS.

## ✨ Características

### 📊 Dashboard
- **Estadísticas en tiempo real**: Clientes, vehículos, servicios y alertas
- **Alertas de servicio**: Visualización de servicios vencidos, urgentes y próximos
- **Servicios recientes**: Historial de los últimos servicios realizados

### 👥 Gestión de Clientes
- ✅ CRUD completo (Crear, Leer, Actualizar, Eliminar)
- 🔍 Búsqueda y filtros avanzados
- ✉️ Validación de email y teléfono
- 📝 Notas y observaciones
- 🔗 Vinculación con vehículos

### 🚗 Gestión de Vehículos
- ✅ CRUD completo con validaciones
- 🔍 Filtros por cliente, marca y alertas
- ⚠️ Sistema de alertas automáticas
- 📋 Historial de servicios por vehículo
- 🎨 Información detallada (marca, modelo, año, color, etc.)

### 🔧 Gestión de Servicios
- ✅ CRUD completo con estados
- 📅 Programación de próximos servicios
- 💰 Control de costos y facturación
- 📝 Descripción detallada y observaciones
- 📊 Estados: Pendiente, En progreso, Completado, Cancelado

### 📈 Reportes y Análisis
- 📊 Reportes por período personalizable
- 💰 Análisis de ingresos por tipo de servicio
- 🏆 Top clientes más frecuentes
- 🚗 Estadísticas por marca y modelo
- 📈 Gráficos anuales de servicios e ingresos
- 📥 Exportación a CSV

### ⚙️ Configuración y Backup
- 💾 Backup y restauración completa
- 📤 Exportación/importación de datos
- 🔔 Configuración de notificaciones
- ⏰ Personalización de alertas
- 📊 Estadísticas del sistema

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Vue.js 3 (Composition API)
- **Routing**: Vue Router 4
- **Estilos**: Tailwind CSS 3
- **Iconos**: Lucide Vue Next
- **Build Tool**: Vite
- **Almacenamiento**: LocalStorage (persistencia del lado cliente)

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+ 
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
cd servicio-automotriz
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

4. **Construir para producción**
```bash
npm run build
```

5. **Vista previa del build**
```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── BaseCard.vue
│   ├── BaseInput.vue
│   ├── ConfirmDialog.vue
│   ├── DropdownMenu.vue
│   ├── LoadingSpinner.vue
│   └── NotificationContainer.vue
├── composables/         # Lógica de negocio reutilizable
│   ├── useAutoService.js    # Gestión principal de datos
│   ├── useBackup.js         # Backup y restauración
│   ├── useDemoData.js       # Datos de ejemplo
│   ├── useFormValidation.js # Validaciones de formularios
│   ├── useNotifications.js  # Sistema de notificaciones
│   └── useReports.js        # Generación de reportes
├── views/               # Páginas de la aplicación
│   ├── Clientes.vue
│   ├── Configuracion.vue
│   ├── Dashboard.vue
│   ├── Reportes.vue
│   ├── Servicios.vue
│   └── Vehiculos.vue
├── App.vue              # Componente raíz
├── main.js              # Punto de entrada
└── style.css            # Estilos globales
```

## 💡 Uso de la Aplicación

### 🎯 Primeros Pasos

1. **Cargar datos demo**: Ve a Configuración → Cargar Datos Demo para poblar la aplicación con datos de ejemplo
2. **Agregar tu primer cliente**: Clientes → Nuevo Cliente
3. **Registrar vehículos**: Vehículos → Nuevo Vehículo
4. **Crear servicios**: Servicios → Nuevo Servicio

### 🔔 Sistema de Alertas

La aplicación monitorea automáticamente:
- **Servicios vencidos** (rojo): Servicios que ya pasaron su fecha
- **Servicios urgentes** (naranja): Servicios próximos (dentro de 7 días)
- **Servicios próximos** (amarillo): Servicios que vencen en los próximos 30 días

### 📊 Reportes

Accede a **Reportes** para:
- Ver estadísticas del período seleccionado
- Analizar ingresos por tipo de servicio
- Identificar clientes más frecuentes
- Exportar datos a CSV

### 💾 Backup y Seguridad

En **Configuración** puedes:
- Exportar backup completo en formato JSON
- Importar datos desde archivo de backup
- Limpiar todos los datos
- Ver estadísticas del sistema

## 🎨 Características Técnicas

### 🔧 Composables (Lógica Reutilizable)

- **useAutoService**: Gestión centralizada de datos (clientes, vehículos, servicios)
- **useFormValidation**: Validaciones de formularios con mensajes de error
- **useNotifications**: Sistema de notificaciones toast
- **useReports**: Generación y exportación de reportes
- **useBackup**: Backup y restauración de datos

### 🎨 Componentes

- **BaseCard**: Tarjetas reutilizables con header y acciones
- **BaseInput**: Input con validación y estados de error
- **ConfirmDialog**: Modal de confirmación personalizable
- **NotificationContainer**: Sistema de notificaciones tipo toast
- **LoadingSpinner**: Indicador de carga

### 📱 Responsive Design

- Diseño completamente responsivo
- Optimizado para desktop, tablet y móvil
- Grid layouts adaptativos
- Navegación móvil amigable

## 🛡️ Validaciones

### Clientes
- ✅ Nombre requerido
- ✅ Email válido y requerido
- ✅ Teléfono válido y requerido

### Vehículos
- ✅ Cliente requerido
- ✅ Patente válida (formato argentino)
- ✅ Marca y modelo requeridos
- ✅ Año válido (1900 - año actual + 1)

### Servicios
- ✅ Vehículo y cliente requeridos
- ✅ Tipo de servicio requerido
- ✅ Fecha válida
- ✅ Costo positivo
- ✅ Estado válido

## 🔄 Estados de Servicio

1. **Pendiente** (amarillo): Servicio programado
2. **En progreso** (azul): Servicio en ejecución
3. **Completado** (verde): Servicio finalizado
4. **Cancelado** (rojo): Servicio cancelado

## 📝 Notas Importantes

- **Almacenamiento**: Los datos se guardan en LocalStorage del navegador
- **Backup**: Se recomienda exportar backups periódicamente
- **Navegadores**: Compatible con navegadores modernos (Chrome, Firefox, Safari, Edge)
- **Datos**: No se envían datos a servidores externos

## 🤝 Contribución

Este proyecto fue desarrollado como una solución completa para talleres automotrices. Las mejoras y sugerencias son bienvenidas.

### 🚀 Posibles Mejoras Futuras

- 🌐 Backend con base de datos
- 📱 Aplicación móvil nativa
- 🔐 Sistema de autenticación
- 📧 Notificaciones por email/SMS
- 📊 Dashboards más avanzados
- 💳 Integración con sistemas de pago
- 📄 Generación de PDF para facturas
- 🔔 Recordatorios automáticos

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo LICENSE para más detalles.

---

**AutoService Pro** - Sistema completo de gestión automotriz 🚗✨
