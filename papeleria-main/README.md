# 🏪 SISTEMA DE GESTIÓN DE PAPELERÍA

## 📋 Descripción

Sistema completo de gestión de papelería con backend Node.js, base de datos MySQL y frontend React. Incluye gestión de productos, proveedores, ventas, compras y reportes.

## 🚀 Inicio Rápido

### Opción 1: Inicio Automático
```bash
iniciar-sistema.bat
```

### Opción 2: Configuración Manual
```bash
# 1. Configurar base de datos
cd Database
ConfigurarMySQL.bat

# 2. Verificar configuración
cd ../PapeleriaPro
node verificar-db.js
node verificar-stored-procedures.js

# 3. Iniciar sistema
npm run dev:full
```

## 📁 Estructura del Proyecto

```
Papeleria/
├── PROBLEMAS_RESUELTOS.md          # Documentación de problemas y soluciones
├── iniciar-sistema.bat             # Script de inicio automático
├── README.md                       # Este archivo
├── Database/
│   ├── PapeleriaDB_MySQL.sql      # Esquema MySQL completo
│   └── ConfigurarMySQL.bat        # Script de configuración de BD
└── PapeleriaPro/
    ├── server.js                   # Servidor Node.js principal
    ├── verificar-db.js            # Verificación de base de datos
    ├── verificar-stored-procedures.js # Verificación de stored procedures
    ├── config.env                 # Configuración de entorno
    ├── package.json               # Dependencias del proyecto
    └── [archivos de configuración] # Configuración de desarrollo
```

## 🔧 Tecnologías Utilizadas

- **Backend**: Node.js + Express
- **Base de Datos**: MySQL
- **Frontend**: React + Vite
- **APIs**: RESTful con stored procedures
- **Validación**: Datos sanitizados y validados

## 📊 Funcionalidades

### ✅ **Gestión Completa:**
- **Productos**: CRUD + búsqueda + stock bajo
- **Proveedores**: CRUD completo
- **Ventas**: CRUD + detalles + reportes
- **Compras**: CRUD + detalles + reportes
- **Estadísticas**: Generales + por categoría
- **JOINs**: Múltiples tipos de consultas

### 🔧 **APIs Disponibles:**
- `GET /api/productos` - Listar productos
- `POST /api/productos` - Agregar producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto
- `GET /api/productos/bajo-stock` - Productos con bajo stock
- `GET /api/productos/buscar?q=term` - Buscar productos
- `GET /api/proveedores` - Listar proveedores
- `GET /api/ventas` - Listar ventas
- `GET /api/compras` - Listar compras
- `GET /api/estadisticas` - Estadísticas generales
- `GET /api/categorias` - Lista de categorías

## 🗄️ Base de Datos

### **Tablas Principales:**
- **Productos**: Inventario de productos
- **Proveedores**: Información de proveedores
- **Ventas**: Registro de ventas
- **Compras**: Registro de compras
- **DetalleVenta**: Detalles de cada venta
- **DetalleCompra**: Detalles de cada compra

### **Stored Procedures (32 total):**
- `sp_MostrarProductos()` - Listar productos
- `sp_InsertarProducto()` - Agregar producto
- `sp_ActualizarProducto()` - Actualizar producto
- `sp_EliminarProducto()` - Eliminar producto
- `sp_ProductosBajoStock()` - Productos con stock bajo
- `sp_BuscarProductos()` - Buscar productos
- Y muchos más...

## 🔍 Verificación de Funcionamiento

### Comandos de verificación:
```bash
# Verificar base de datos
node verificar-db.js

# Verificar stored procedures
node verificar-stored-procedures.js

# Verificar servidor
node server.js
```

### Resultados esperados:
- ✅ "Conexión exitosa a MySQL"
- ✅ "Todos los stored procedures están definidos"
- ✅ "Server running on port 30011"

## 🚀 Puertos y URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:30011
- **API Health**: http://localhost:30011/api/health

## 📞 Soporte

Si hay problemas:

1. **Verificar MySQL**: Asegurar que esté ejecutándose
2. **Verificar puertos**: 3000 (frontend) y 30011 (backend)
3. **Verificar credenciales**: Usuario root, password Aa22559845
4. **Recrear base de datos**: `cd Database && ConfigurarMySQL.bat`

## 📋 Documentación Adicional

- `PROBLEMAS_RESUELTOS.md` - Problemas identificados y soluciones
- `ARCHIVOS_ELIMINADOS.md` - Registro de limpieza del proyecto

---

**Estado**: ✅ **SISTEMA COMPLETAMENTE FUNCIONAL**
**Última actualización**: Limpieza de archivos innecesarios completada 