# 🚗 AutoService Pro

La guía para la persona que utiliza el sistema está disponible en [MANUAL_USUARIO.md](MANUAL_USUARIO.md) y dentro de la aplicación desde la opción **Ayuda**.

## Guardado seguro en disco y migración (octubre de 2026)

El almacenamiento principal ahora es **SQLite**, no el perfil del navegador. Requiere **Node.js 22.13 o superior**. No hay que instalar ni administrar un servidor de bases de datos aparte.

1. Antes de actualizar la PC del taller, descargá un JSON actual y conservá su original. No limpies el navegador: puede contener cambios todavía no respaldados.
2. Ejecutá `npm install`, después `npm start` (o `npm run dev`), y abrí **http://localhost:5173**.
3. La primera vez elegí **Migrar estos registros al disco** si aparecen los datos del navegador. Revisá las cantidades. También podés **Importar una copia JSON existente**, incluidos los backups anteriores de Drive. No edites el JSON a mano.
4. Elegí **empezar sin registros** solamente para una instalación realmente nueva. Si ya existía una base o hay respaldos, no borres archivos para forzar el inicio.
5. Verificá clientes, vehículos, servicios, órdenes y adjuntos antes de continuar trabajando. El aviso superior debe decir **Guardado en disco verificado**.

En Windows se guarda en `%LOCALAPPDATA%\BrabusService\taller.sqlite`; sus JSON están en `backups` dentro de esa carpeta. La ruta exacta aparece arriba del programa. Los datos quedan **fuera de GitHub y del repositorio**. Para pruebas se puede usar `BRABUS_DATA_DIR` apuntando a una carpeta aislada; no cambiar esta variable en el taller sin trasladar y verificar primero sus datos.

Cada modificación usa una transacción SQLite y una revisión: una pestaña vieja recibe un conflicto y no puede pisar registros nuevos. El mensaje de éxito se emite después de escribir y releer el estado. Se conservan 50 copias JSON recientes más una por día de hasta 30 jornadas. Si falla el JSON adicional, el programa distingue esa advertencia del guardado confirmado en SQLite.

Drive se intenta actualizar también a los 5 minutos de cambios pendientes (programa abierto, conexión y autorización válidas). Se conservan 20 copias recientes y una por día de hasta 14 jornadas. Nunca se sube automáticamente un taller vacío. La nube **no** sustituye el guardado local ni garantiza cambios que todavía figuran pendientes.

`npm test` incluye pruebas reales de SQLite y de la API local con carpetas temporales: migración del formato anterior, reinicio, borrado simulado del navegador, conflictos entre pestañas, fallo de red, verificación y recuperación. No usan credenciales ni datos reales.

Para volver a una versión anterior al cambio, **exportá primero un JSON actualizado desde la versión nueva** y verificalo; esa versión antigua no lee SQLite. No borres la carpeta de datos ni reemplaces la base por una copia vieja para revertir código.

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
- **Almacenamiento**: SQLite en disco, JSON locales rotativos y respaldo opcional en Drive

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 22.13 o superior
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

## Cuenta de Google Drive del taller

Copiar `.env.example` a `.env.local` y completar `VITE_GOOGLE_CLIENT_ID` con el cliente OAuth web y `VITE_GOOGLE_DRIVE_EMAIL` con el correo del taller. Reiniciar `npm run dev` después de modificar estas variables; volver a compilar si se usa una versión de producción. `.env.local` no se publica en GitHub. El correo estará visible en la aplicación compilada: no es una contraseña ni un secreto.

Desde **Configuración → Conectar**, iniciar sesión y autorizar esa cuenta. El programa la sugiere mediante `login_hint` y verifica el correo real con `Drive about.get` antes de habilitar backups, documentos o fotos. Una cuenta distinta o una verificación fallida no habilitan operaciones en Drive. Se mantiene el permiso limitado `drive.file`; no hace falta una contraseña ni Client Secret en el código.

Si Google muestra «acceso bloqueado» y el cliente OAuth está en modo de prueba, el administrador del proyecto debe agregar la cuenta del taller como usuario de prueba en Google Cloud. Cambiar el correo no traslada archivos de una cuenta anterior ni cambia los datos locales.

Referencias: [OAuth y login_hint](https://developers.google.com/identity/oauth2/web/reference/js-reference), [consulta de cuenta de Drive con drive.file](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get).

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
- Ver el estado de guardado en disco y de las copias locales automáticas
- Mantener en Google Drive copias recientes y diarias
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

- **Almacenamiento**: Los datos se confirman en SQLite y tienen JSON locales rotativos. El navegador conserva solo información auxiliar.
- **Dirección fija**: Usar siempre `http://localhost:5173` con `npm run dev`. Si el puerto está ocupado, Vite se detiene en lugar de cambiarlo y mostrar otro almacenamiento. `npm run preview` usa 4173 solo para verificar la compilación, no para el uso habitual del taller.
- **Reportes**: Los importes y el resumen del período incluyen únicamente servicios completados y se muestran como «Total de trabajos realizados». No existe un registro de cobros; no deben interpretarse como dinero cobrado. El conteo anual de servicios conserva todos los estados.
- **Recuperación**: Si SQLite no puede leerse, el programa se detiene y solicita recuperación: nunca presenta un taller vacío como si no hubiera pasado nada. Se pueden importar los JSON anteriores, verificando cantidades y relaciones.
- **Backup externo**: Google Drive conserva copias recientes y diarias cuando está conectado; un aviso pendiente significa que los últimos cambios todavía no tienen respaldo confirmado en la nube.
- **Navegadores**: Compatible con navegadores modernos (Chrome, Firefox, Safari, Edge)
- **Datos**: Solo se envían a Google Drive cuando el usuario conecta y habilita esa opción

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
