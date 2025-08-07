require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Inicializar express
const app = express();

// Conectar a MongoDB
connectDB().catch(err => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const proveedorRoutes = require('./routes/proveedorRoutes');
const productoRoutes = require('./routes/productoRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const compraRoutes = require('./routes/compraRoutes');

// Usar rutas
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/compras', compraRoutes);

// Ruta de inicio con documentación de endpoints
app.get('/', (req, res) => {
    res.json({
        message: 'API de Papelería funcionando correctamente',
        endpoints: {
            proveedores: {
                GET: '/api/proveedores - Obtener todos los proveedores',
                POST: '/api/proveedores - Crear un nuevo proveedor',
                GET_ONE: '/api/proveedores/:id - Obtener un proveedor específico',
                PUT: '/api/proveedores/:id - Actualizar un proveedor',
                DELETE: '/api/proveedores/:id - Eliminar un proveedor'
            },
            productos: {
                GET: '/api/productos - Obtener todos los productos',
                POST: '/api/productos - Crear un nuevo producto',
                GET_ONE: '/api/productos/:id - Obtener un producto específico',
                PUT: '/api/productos/:id - Actualizar un producto',
                DELETE: '/api/productos/:id - Eliminar un producto'
            },
            ventas: {
                GET: '/api/ventas - Obtener todas las ventas',
                POST: '/api/ventas - Crear una nueva venta',
                GET_ONE: '/api/ventas/:id - Obtener una venta específica',
                PATCH: '/api/ventas/:id/estado - Actualizar estado de una venta'
            },
            compras: {
                GET: '/api/compras - Obtener todas las compras',
                POST: '/api/compras - Crear una nueva compra',
                GET_ONE: '/api/compras/:id - Obtener una compra específica',
                PATCH: '/api/compras/:id/estado - Actualizar estado de una compra'
            }
        }
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
