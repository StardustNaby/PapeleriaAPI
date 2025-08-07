const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');

// Cargar configuración según el entorno
const envFile = process.env.NODE_ENV === 'production' ? './config.production.env' : './config.env';
require('dotenv').config({ path: envFile });

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Config file: ${envFile}`);

const app = express();
let PORT = parseInt(process.env.PORT) || 3000;

// MySQL Database configuration
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Aa22559845',
  database: process.env.MYSQL_DATABASE || 'carlospapeleriagongoraeuan',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create MySQL connection pool
const mysqlPool = mysql.createPool(mysqlConfig);
const mysqlPromise = mysqlPool.promise();

// ===== FUNCIÓN GLOBAL DE LIMPIEZA DE DATOS =====
function cleanDataForDatabase(data, schema) {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      console.warn(`⚠️ Campo ${key} es undefined, convirtiendo a null`);
      cleaned[key] = null;
    } else if (value === '' || value === 'undefined' || value === 'null') {
      console.warn(`⚠️ Campo ${key} está vacío, convirtiendo a null`);
      cleaned[key] = null;
    } else if (typeof value === 'string') {
      cleaned[key] = value.trim();
    } else {
      cleaned[key] = value;
    }
  }
  
  // Validar que no queden undefined
  Object.entries(cleaned).forEach(([key, value]) => {
    if (value === undefined) {
      throw new Error(`Campo ${key} no puede ser undefined después de la limpieza`);
    }
  });
  
  console.log('🧹 Datos limpiados:', cleaned);
  return cleaned;
}

// Middleware
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000', `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the dist directory (React build)
app.use(express.static(path.join(__dirname, 'dist')));

// Test database connection
async function testDatabase() {
  try {
    const [rows] = await mysqlPromise.execute('SELECT COUNT(*) as count FROM Productos');
    console.log('✅ Database connected successfully');
    console.log(`📊 Products in database: ${rows[0].count}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute('SELECT 1 as health');
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      databaseName: process.env.MYSQL_DATABASE,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// ===== PRODUCTOS (CRUD) CON STORED PROCEDURES =====
// Get products using stored procedure
app.get('/api/productos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    // Usar stored procedure para obtener productos
    const [rows] = await mysqlPromise.execute('CALL sp_MostrarProductos()');
    
    // Aplicar paginación en JavaScript
    const total = rows[0].length;
    const paginatedRows = rows[0].slice(offset, offset + pageSize);
    
    res.json({
      productos: paginatedRows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Error getting products' });
  }
});

// Get products with low stock using stored procedure - DEBE IR ANTES DE /:id
app.get('/api/productos/bajo-stock', async (req, res) => {
  try {
    const [result] = await mysqlPromise.execute('CALL sp_ProductosBajoStock()');
    res.json({ productos: result[0] });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({ error: 'Error getting low stock products' });
  }
});

// Search products - DEBE IR ANTES DE /:id
app.get('/api/productos/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    const searchTerm = `%${q}%`;
    
    const [rows] = await mysqlPromise.execute(
      `CALL sp_BuscarProductos(?)`,
      [searchTerm]
    );
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Error searching products' });
  }
});

// Get product by ID using stored procedure - DEBE IR DESPUÉS DE RUTAS ESPECÍFICAS
app.get('/api/productos/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    
    // Usar stored procedure para obtener producto
    const [result] = await mysqlPromise.execute(
      'CALL sp_ObtenerProducto(?)',
      [productId]
    );
    
    if (result[0].length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ producto: result[0][0] });
    
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Error getting product' });
  }
});

// Add new product using stored procedure
app.post('/api/productos', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Extraer datos del body
    const { 
      Nombre, 
      Descripcion, 
      Precio, 
      Stock, 
      StockMinimo, 
      Categoria, 
      CodigoBarras,
      ProveedorId 
    } = req.body;
    
    const productData = {
      Nombre,
      Descripcion,
      Precio,
      Stock,
      StockMinimo,
      Categoria,
      CodigoBarras,
      ProveedorId
    };
     
    console.log('📥 Processed product data:', productData);
    
    // Validación de campos requeridos
    if (!productData.Nombre || productData.Nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del producto es requerido' });
    }
    
    if (!productData.Precio || isNaN(parseFloat(productData.Precio)) || parseFloat(productData.Precio) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor a 0' });
    }
    
    // Usar función global de limpieza
    const cleanData = cleanDataForDatabase(productData);
    
    // Procesar campos específicos después de la limpieza
    cleanData.Precio = parseFloat(cleanData.Precio);
    cleanData.Stock = cleanData.Stock && !isNaN(parseInt(cleanData.Stock)) ? parseInt(cleanData.Stock) : 0;
    cleanData.StockMinimo = cleanData.StockMinimo && !isNaN(parseInt(cleanData.StockMinimo)) ? parseInt(cleanData.StockMinimo) : 0;
    cleanData.ProveedorId = cleanData.ProveedorId && !isNaN(parseInt(cleanData.ProveedorId)) ? parseInt(cleanData.ProveedorId) : null;
    
    console.log('🧹 Clean product data for database:', cleanData);
     
    // Usar stored procedure para insertar producto
     const [result] = await mysqlPromise.execute(
      'CALL sp_InsertarProducto(?, ?, ?, ?, ?, ?, ?, ?)',
      [
        cleanData.Nombre, 
        cleanData.Descripcion, 
        cleanData.Precio, 
        cleanData.Stock, 
        cleanData.StockMinimo, 
        cleanData.Categoria, 
        cleanData.CodigoBarras || null,
        cleanData.ProveedorId
      ]
    );
    
    const newProductId = result[0][0].IdInsertado;
    
    console.log('✅ Product created successfully with ID:', newProductId);
    
    // Obtener el producto creado usando stored procedure
    const [newProduct] = await mysqlPromise.execute(
      'CALL sp_ObtenerProducto(?)',
      [newProductId]
    );
    
    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: newProduct[0][0],
      id: newProductId
    });
    
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ 
      error: 'Error creating product',
      details: error.message 
    });
  }
});

// Update product using stored procedure
app.put('/api/productos/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { 
      Nombre, 
      Descripcion, 
      Precio, 
      Stock, 
      StockMinimo, 
      Categoria, 
      CodigoBarras,
      ProveedorId 
    } = req.body;
    
    // Validación
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    
    if (!Nombre || Nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del producto es requerido' });
    }
    
    // Limpiar datos
    const cleanData = cleanDataForDatabase({
      Nombre, Descripcion, Precio, Stock, StockMinimo, Categoria, CodigoBarras, ProveedorId
    });
    
    // Procesar campos específicos
    cleanData.Precio = parseFloat(cleanData.Precio);
    cleanData.Stock = cleanData.Stock && !isNaN(parseInt(cleanData.Stock)) ? parseInt(cleanData.Stock) : 0;
    cleanData.StockMinimo = cleanData.StockMinimo && !isNaN(parseInt(cleanData.StockMinimo)) ? parseInt(cleanData.StockMinimo) : 0;
    cleanData.ProveedorId = cleanData.ProveedorId && !isNaN(parseInt(cleanData.ProveedorId)) ? parseInt(cleanData.ProveedorId) : null;
    
    // Usar stored procedure para actualizar
    const [result] = await mysqlPromise.execute(
      'CALL sp_ActualizarProducto(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        productId,
        cleanData.Nombre, 
        cleanData.Descripcion, 
        cleanData.Precio, 
        cleanData.Stock, 
        cleanData.StockMinimo, 
        cleanData.Categoria, 
        cleanData.CodigoBarras || null,
        cleanData.ProveedorId
      ]
    );
    
    const rowsAffected = result[0][0].FilasActualizadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
     
    // Obtener el producto actualizado
    const [updatedProduct] = await mysqlPromise.execute(
      'CALL sp_ObtenerProducto(?)',
      [productId]
    );
    
    res.json({
      message: 'Producto actualizado exitosamente',
      producto: updatedProduct[0][0]
    });
    
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
});

// Delete product using stored procedure (soft delete)
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }
    
    // Usar stored procedure para eliminar (soft delete)
    const [result] = await mysqlPromise.execute(
      'CALL sp_EliminarProducto(?)',
      [productId]
    );
    
    const rowsAffected = result[0][0].FilasEliminadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ message: 'Producto eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// ===== PROVEEDORES (CRUD) CON STORED PROCEDURES =====
// Get providers using stored procedure
app.get('/api/proveedores', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute('CALL sp_MostrarProveedores()');
    res.json({ proveedores: rows[0] });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({ error: 'Error getting providers' });
  }
});

// Add new provider using stored procedure
app.post('/api/proveedores', async (req, res) => {
  try {
    const { Nombre, Email, Telefono, Direccion } = req.body;
    
    if (!Nombre || Nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }
    
    const cleanData = cleanDataForDatabase({ Nombre, Email, Telefono, Direccion });
    
    // Usar stored procedure para insertar proveedor
    const [result] = await mysqlPromise.execute(
      'CALL sp_InsertarProveedor(?, ?, ?, ?)',
      [cleanData.Nombre, cleanData.Email, cleanData.Telefono, cleanData.Direccion]
    );
    
    const newProviderId = result[0][0].IdInsertado;
    
    // Obtener el proveedor creado
    const [newProvider] = await mysqlPromise.execute(
      'CALL sp_ObtenerProveedor(?)',
      [newProviderId]
    );
    
    res.status(201).json({
      message: 'Proveedor creado exitosamente',
      proveedor: newProvider[0][0],
      id: newProviderId
    });
    
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ error: 'Error creating provider' });
  }
});

// Update provider using stored procedure
app.put('/api/proveedores/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { Nombre, Email, Telefono, Direccion } = req.body;
    
    if (!providerId || isNaN(providerId)) {
      return res.status(400).json({ error: 'ID de proveedor inválido' });
    }
    
    if (!Nombre || Nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }
    
    const cleanData = cleanDataForDatabase({ Nombre, Email, Telefono, Direccion });
    
    // Usar stored procedure para actualizar
    const [result] = await mysqlPromise.execute(
      'CALL sp_ActualizarProveedor(?, ?, ?, ?, ?)',
      [providerId, cleanData.Nombre, cleanData.Email, cleanData.Telefono, cleanData.Direccion]
    );
    
    const rowsAffected = result[0][0].FilasActualizadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    
    // Obtener el proveedor actualizado
    const [updatedProvider] = await mysqlPromise.execute(
      'CALL sp_ObtenerProveedor(?)',
      [providerId]
    );
    
    res.json({
      message: 'Proveedor actualizado exitosamente',
      proveedor: updatedProvider[0][0]
    });
    
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ error: 'Error updating provider' });
  }
});

// Delete provider using stored procedure (soft delete)
app.delete('/api/proveedores/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    
    if (!providerId || isNaN(providerId)) {
      return res.status(400).json({ error: 'ID de proveedor inválido' });
    }
    
    // Usar stored procedure para eliminar
    const [result] = await mysqlPromise.execute(
      'CALL sp_EliminarProveedor(?)',
      [providerId]
    );
    
    const rowsAffected = result[0][0].FilasEliminadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    
    res.json({ message: 'Proveedor eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ error: 'Error deleting provider' });
  }
});

// Get provider by ID using stored procedure
app.get('/api/proveedores/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    
    if (!providerId || isNaN(providerId)) {
      return res.status(400).json({ error: 'ID de proveedor inválido' });
    }
    
    const [result] = await mysqlPromise.execute(
      'CALL sp_ObtenerProveedor(?)',
      [providerId]
    );
    
    if (result[0].length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    
    res.json({ proveedor: result[0][0] });
    
  } catch (error) {
    console.error('Error getting provider:', error);
    res.status(500).json({ error: 'Error getting provider' });
  }
});

// ===== VENTAS (CRUD) CON STORED PROCEDURES =====
// Get sales using stored procedure
app.get('/api/ventas', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute('CALL sp_MostrarVentas()');
    res.json({ ventas: rows[0] });
  } catch (error) {
    console.error('Error getting sales:', error);
    res.status(500).json({ error: 'Error getting sales' });
  }
});

// Add new sale using stored procedure
app.post('/api/ventas', async (req, res) => {
  try {
    const { Cliente, Total, MetodoPago, Estado } = req.body;
    
    // Validación de campos requeridos
    if (!Cliente || Cliente.trim() === '') {
      return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    }
    
    if (!Total || isNaN(parseFloat(Total)) || parseFloat(Total) <= 0) {
      return res.status(400).json({ error: 'El total debe ser un número mayor a 0' });
    }
    
    const cleanData = cleanDataForDatabase({ Cliente, Total, MetodoPago, Estado });
    cleanData.Total = parseFloat(cleanData.Total);
    cleanData.Cliente = cleanData.Cliente.trim();
    
    // Usar stored procedure para insertar venta
    const [result] = await mysqlPromise.execute(
      'CALL sp_InsertarVenta(?, ?, ?, ?)',
      [cleanData.Cliente, cleanData.Total, cleanData.MetodoPago || 'Efectivo', cleanData.Estado || 'Completada']
    );
    
    const newSaleId = result[0][0].IdInsertado;
    
    // Obtener la venta creada
    const [newSale] = await mysqlPromise.execute(
      'CALL sp_ObtenerVenta(?)',
      [newSaleId]
    );
    
    res.status(201).json({
      message: 'Venta creada exitosamente',
      venta: newSale[0][0],
      id: newSaleId
    });
    
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Error creating sale' });
  }
});

// Update sale
app.put('/api/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Extraer datos del body (esperamos mayúsculas del frontend)
    const { 
      Cliente, 
      Total, 
      MetodoPago, 
      Estado 
    } = req.body;
    
    const saleData = {
      Cliente,
      Total,
      MetodoPago,
      Estado
    };
    
    console.log('📥 Updating sale data:', { id, ...saleData });
    
    // Validación de campos requeridos
    if (!saleData.Cliente || saleData.Cliente.trim() === '') {
      return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    }
    
    if (!saleData.Total || isNaN(parseFloat(saleData.Total)) || parseFloat(saleData.Total) <= 0) {
      return res.status(400).json({ error: 'El total debe ser un número mayor a 0' });
    }
    
    // Usar función global de limpieza
    const cleanData = cleanDataForDatabase(saleData);
    
    // Procesar campos específicos después de la limpieza
    cleanData.Total = parseFloat(cleanData.Total);
    cleanData.MetodoPago = cleanData.MetodoPago || 'Efectivo';
    cleanData.Estado = cleanData.Estado || 'Completada';
    
    console.log('🧹 Clean sale data for update:', cleanData);
    
    // Verificar que la venta existe
    const [existing] = await mysqlPromise.execute('SELECT Id FROM Ventas WHERE Id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    const [result] = await mysqlPromise.execute(
      'CALL sp_ActualizarVenta(?, ?, ?, ?, ?)',
      [id, cleanData.Cliente, cleanData.Total, cleanData.MetodoPago, cleanData.Estado]
    );
    
    const rowsAffected = result[0][0].FilasActualizadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    // Obtener la venta actualizada
    const [updatedSale] = await mysqlPromise.execute(
      'CALL sp_ObtenerVenta(?)',
      [id]
    );
    
    res.json({
      message: 'Venta actualizada exitosamente',
      venta: updatedSale[0][0]
    });
    
  } catch (error) {
    console.error('❌ Error updating sale:', error);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

// Delete sale
app.delete('/api/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número válido
    const saleId = parseInt(id);
    if (isNaN(saleId) || saleId <= 0) {
      console.warn(`⚠️ ID de venta inválido: ${id}`);
      return res.status(400).json({ error: 'ID de venta inválido' });
    }
    
    const [result] = await mysqlPromise.execute('CALL sp_EliminarVenta(?)', [saleId]);
    
    const rowsAffected = result[0][0].FilasEliminadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json({ success: true, message: 'Venta eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Error deleting sale' });
  }
});

// Get sales by day using stored procedure
app.get('/api/ventas/por-dia', async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const [result] = await mysqlPromise.execute('CALL sp_VentasPorDia(?)', [dias]);
    res.json({ ventas: result[0] });
  } catch (error) {
    console.error('Error getting sales by day:', error);
    res.status(500).json({ error: 'Error getting sales by day' });
  }
});

// ===== COMPRAS (CRUD) CON STORED PROCEDURES =====
// Get purchases using stored procedure
app.get('/api/compras', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute('CALL sp_MostrarCompras()');
    res.json({ compras: rows[0] });
  } catch (error) {
    console.error('Error getting purchases:', error);
    res.status(500).json({ error: 'Error getting purchases' });
  }
});

// Get single purchase with details
app.get('/api/compras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get purchase info
    const [compraRows] = await mysqlPromise.execute(
      `SELECT c.*, p.Nombre as ProveedorNombre 
       FROM Compras c 
       LEFT JOIN Proveedores p ON c.ProveedorId = p.Id 
       WHERE c.Id = ?`,
      [id]
    );
    
    if (compraRows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    // Get purchase details
    const [detalleRows] = await mysqlPromise.execute(
      `SELECT dc.*, p.Nombre as ProductoNombre, p.CodigoBarras 
       FROM DetalleCompra dc 
       LEFT JOIN Productos p ON dc.ProductoId = p.Id 
       WHERE dc.CompraId = ?`,
      [id]
    );
    
    res.json({
      compra: compraRows[0],
      detalles: detalleRows
    });
  } catch (error) {
    console.error('Error getting purchase:', error);
    res.status(500).json({ error: 'Error getting purchase' });
  }
});

// Add new purchase using stored procedure
app.post('/api/compras', async (req, res) => {
  try {
    const { Total, MetodoPago, Estado, ProveedorId, Observaciones } = req.body;
    
    if (!Total || isNaN(parseFloat(Total)) || parseFloat(Total) <= 0) {
      return res.status(400).json({ error: 'El total debe ser un número mayor a 0' });
    }
    
    const cleanData = cleanDataForDatabase({ Total, MetodoPago, Estado, ProveedorId, Observaciones });
    cleanData.Total = parseFloat(cleanData.Total);
    cleanData.ProveedorId = cleanData.ProveedorId && !isNaN(parseInt(cleanData.ProveedorId)) ? parseInt(cleanData.ProveedorId) : null;
    
    // Usar stored procedure para insertar compra con 5 parámetros en el orden correcto
    const [result] = await mysqlPromise.execute(
      'CALL sp_InsertarCompra(?, ?, ?, ?, ?)',
      [
        cleanData.ProveedorId, 
        cleanData.Total, 
        cleanData.MetodoPago || 'Efectivo', 
        cleanData.Estado || 'Completada', 
        cleanData.Observaciones || null
      ]
    );
    
    const newPurchaseId = result[0][0].IdInsertado;
    
    // Obtener la compra creada
    const [newPurchase] = await mysqlPromise.execute(
      'CALL sp_ObtenerCompra(?)',
      [newPurchaseId]
    );
    
    res.status(201).json({
      message: 'Compra creada exitosamente',
      compra: newPurchase[0][0],
      id: newPurchaseId
    });
    
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Error creating purchase' });
  }
});

// Update purchase
app.put('/api/compras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ProveedorId, Total, MetodoPago, Estado, Observaciones, detalles } = req.body;
    
    console.log('📥 Updating purchase data:', { id, ProveedorId, Total, MetodoPago, Estado, Observaciones });
    
    // Validación de campos requeridos
    if (!ProveedorId || isNaN(parseInt(ProveedorId))) {
      return res.status(400).json({ error: 'El proveedor es requerido' });
    }
    
    // Usar función global de limpieza
    const rawData = { ProveedorId, Total, MetodoPago, Estado, Observaciones };
    const cleanData = cleanDataForDatabase(rawData);
    
    // Procesar campos específicos después de la limpieza
    cleanData.ProveedorId = parseInt(cleanData.ProveedorId);
    cleanData.Total = parseFloat(cleanData.Total) || 0;
    cleanData.MetodoPago = cleanData.MetodoPago || 'Efectivo';
    cleanData.Estado = cleanData.Estado || 'Completada';
    
    console.log('🧹 Clean purchase data for update:', cleanData);
    
    // Actualizar la compra
    const [result] = await mysqlPromise.execute(
      'CALL sp_ActualizarCompra(?, ?, ?, ?, ?, ?)',
      [id, cleanData.ProveedorId, cleanData.Total, cleanData.MetodoPago, cleanData.Estado, cleanData.Observaciones]
    );
    
    const rowsAffected = result[0][0].FilasActualizadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    // Si se proporcionan nuevos detalles, actualizar
    if (detalles && Array.isArray(detalles)) {
      // Eliminar detalles existentes
      await mysqlPromise.execute('CALL sp_EliminarDetallesCompra(?)', [id]);
      
      // Insertar nuevos detalles
      let totalCalculado = 0;
      for (const detalle of detalles) {
        const { ProductoId, Cantidad, PrecioUnitario } = detalle;
        
        if (!ProductoId || !Cantidad || !PrecioUnitario) {
          continue;
        }
        
        const subtotal = parseFloat(Cantidad) * parseFloat(PrecioUnitario);
        totalCalculado += subtotal;
        
        await mysqlPromise.execute(
          'CALL sp_InsertarDetalleCompra(?, ?, ?, ?, ?)',
          [id, ProductoId, Cantidad, PrecioUnitario, subtotal]
        );
      }
      
      // Actualizar el total
      if (totalCalculado > 0) {
        await mysqlPromise.execute(
          'CALL sp_ActualizarCompra(?, ?, ?, ?, ?, ?)',
          [id, cleanData.ProveedorId, totalCalculado, cleanData.MetodoPago, cleanData.Estado, cleanData.Observaciones]
        );
      }
    }
    
    // Obtener la compra actualizada
    const [updatedPurchase] = await mysqlPromise.execute(
      'CALL sp_ObtenerCompra(?)',
      [id]
    );
    
    res.json({ 
      message: 'Compra actualizada exitosamente',
      compra: updatedPurchase[0][0]
    });
  } catch (error) {
    console.error('❌ Error updating purchase:', error);
    res.status(500).json({ error: 'Error al actualizar compra' });
  }
});

// Delete purchase
app.delete('/api/compras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número válido
    const purchaseId = parseInt(id);
    if (isNaN(purchaseId) || purchaseId <= 0) {
      console.warn(`⚠️ ID de compra inválido: ${id}`);
      return res.status(400).json({ error: 'ID de compra inválido' });
    }
    
    // Verificar si la compra existe
    const [compraRows] = await mysqlPromise.execute('CALL sp_ObtenerCompra(?)', [purchaseId]);
    if (compraRows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    // Obtener detalles para revertir stock
    const [detalleRows] = await mysqlPromise.execute('CALL sp_ObtenerDetallesCompra(?)', [purchaseId]);
    
    // Revertir stock de productos
    for (const detalle of detalleRows) {
      if (detalle.ProductoID && detalle.Cantidad) {
        await mysqlPromise.execute(
          'CALL sp_ActualizarStockProducto(?, ?)',
          [detalle.ProductoID, detalle.Cantidad]
        );
      }
    }
    
    // Eliminar la compra (los detalles se eliminan automáticamente por CASCADE)
    const [result] = await mysqlPromise.execute('CALL sp_EliminarCompra(?)', [purchaseId]);
    
    const rowsAffected = result[0][0].FilasEliminadas;
    
    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    res.json({ success: true, message: 'Compra eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ error: 'Error deleting purchase' });
  }
});

// ===== DETALLE DE VENTA =====
// Get sale details
app.get('/api/ventas/:id/detalles', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await mysqlPromise.execute(
      `SELECT dv.*, p.Nombre as ProductoNombre, p.CodigoBarras 
       FROM DetalleVenta dv 
       LEFT JOIN Productos p ON dv.ProductoId = p.Id 
       WHERE dv.VentaId = ?`,
      [id]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error getting sale details:', error);
    res.status(500).json({ error: 'Error getting sale details' });
  }
});

// Add sale details
app.post('/api/ventas/:id/detalles', async (req, res) => {
  try {
    const { id } = req.params;
    const { ProductoId, Cantidad, PrecioUnitario } = req.body;
    
    // Validación
    if (!ProductoId || !Cantidad || !PrecioUnitario) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const subtotal = parseFloat(Cantidad) * parseFloat(PrecioUnitario);
    
    // Verificar stock disponible
    const [stockRows] = await mysqlPromise.execute('CALL sp_ObtenerStockProducto(?)', [ProductoId]);
    if (stockRows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    if (stockRows[0].Stock < Cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }
    
    // Insertar detalle
    await mysqlPromise.execute(
      'CALL sp_InsertarDetalleVenta(?, ?, ?, ?, ?)',
      [id, ProductoId, Cantidad, PrecioUnitario, subtotal]
    );
    
    // Actualizar stock
    await mysqlPromise.execute(
      'CALL sp_ActualizarStockProducto(?, ?)',
      [ProductoId, Cantidad]
    );
    
    // Actualizar total de la venta
    const [totalRows] = await mysqlPromise.execute(
      'CALL sp_ObtenerTotalVenta(?)',
      [id]
    );
    
    await mysqlPromise.execute(
      'CALL sp_ActualizarVenta(?, ?, ?, ?, ?)',
      [id, totalRows[0].Total || 0, totalRows[0].MetodoPago || 'Efectivo', totalRows[0].Estado || 'Completada', totalRows[0].Total || 0]
    );
    
    res.json({ 
      success: true, 
      message: 'Detalle de venta agregado exitosamente',
      subtotal: subtotal
    });
  } catch (error) {
    console.error('Error adding sale detail:', error);
    res.status(500).json({ error: 'Error adding sale detail' });
  }
});

// ===== CATEGORÍAS =====
app.get('/api/categorias', async (req, res) => {
  try {
    // Obtener categorías únicas de la tabla Productos
    const [rows] = await mysqlPromise.execute(
      'CALL sp_ObtenerCategorias()'
    );
    
    // Extraer solo los nombres de las categorías
    const categorias = rows[0].map(row => row.Categoria);
    
    // Si no hay categorías, agregar algunas por defecto
    if (categorias.length === 0) {
      console.log('📝 No se encontraron categorías, agregando categorías por defecto...');
      
      // Categorías por defecto para papelería
      const categoriasDefault = [
        'Papelería',
        'Herramientas',
        'Organización',
        'Arte y Manualidades',
        'Tecnología',
        'Escritura',
        'Dibujo',
        'Matemáticas',
        'Ciencias',
        'Oficina',
        'Impresión',
        'Adhesivos',
        'Colores',
        'Mochilas',
        'Útiles Escolares'
      ];
      
      res.json(categoriasDefault);
    } else {
      console.log(`✅ Categorías encontradas: ${categorias.length}`);
      res.json(categorias);
    }
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Error getting categories' });
  }
});

// ===== REPORTES Y ESTADÍSTICAS CON STORED PROCEDURES =====
// Get general statistics using stored procedure
app.get('/api/estadisticas', async (req, res) => {
  try {
    const [result] = await mysqlPromise.execute('CALL sp_EstadisticasGenerales()');
    res.json({ estadisticas: result[0][0] });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Error getting statistics' });
  }
});

// ===== ENDPOINTS DE JOINs Y CROSS JOIN =====

// INNER JOIN - Productos con proveedores (solo productos que tienen proveedor)
app.post('/api/joins/inner', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        p.Id,
        p.Nombre as ProductoNombre,
        p.Descripcion,
        p.Precio,
        p.Stock,
        p.Categoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        pr.Telefono as ProveedorTelefono
      FROM Productos p
      INNER JOIN Proveedores pr ON p.ProveedorId = pr.Id
      WHERE p.Activo = 1 AND pr.Activo = 1
      ORDER BY p.Nombre
    `);

    res.json({
      data: rows,
      headers: ['ID', 'Producto', 'Descripción', 'Precio', 'Stock', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email', 'Teléfono'],
      total: rows.length,
      description: 'Productos que tienen proveedor asignado'
    });
  } catch (error) {
    console.error('Error in INNER JOIN:', error);
    res.status(500).json({ error: 'Error en INNER JOIN' });
  }
});

// LEFT JOIN - Todos los productos (incluyendo los sin proveedor)
app.post('/api/joins/left', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        p.Id,
        p.Nombre as ProductoNombre,
        p.Descripcion,
        p.Precio,
        p.Stock,
        p.Categoria,
        COALESCE(pr.Id, 'Sin proveedor') as ProveedorId,
        COALESCE(pr.Nombre, 'Sin proveedor') as ProveedorNombre,
        COALESCE(pr.Email, 'N/A') as ProveedorEmail,
        COALESCE(pr.Telefono, 'N/A') as ProveedorTelefono
      FROM Productos p 
      LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id
      WHERE p.Activo = 1
      ORDER BY p.Nombre
    `);
    
    res.json({
      data: rows,
      headers: ['ID', 'Producto', 'Descripción', 'Precio', 'Stock', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email', 'Teléfono'],
      total: rows.length,
      description: 'Todos los productos (incluyendo los sin proveedor)'
    });
  } catch (error) {
    console.error('Error in LEFT JOIN:', error);
    res.status(500).json({ error: 'Error en LEFT JOIN' });
  }
});

// RIGHT JOIN - Todos los proveedores (incluyendo los sin productos)
app.post('/api/joins/right', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        COALESCE(p.Id, 'Sin productos') as ProductoId,
        COALESCE(p.Nombre, 'Sin productos') as ProductoNombre,
        COALESCE(p.Descripcion, 'N/A') as Descripcion,
        COALESCE(p.Precio, 0) as Precio,
        COALESCE(p.Stock, 0) as Stock,
        COALESCE(p.Categoria, 'N/A') as Categoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        pr.Telefono as ProveedorTelefono
      FROM Productos p
      RIGHT JOIN Proveedores pr ON p.ProveedorId = pr.Id
      WHERE pr.Activo = 1
      ORDER BY pr.Nombre, p.Nombre
    `);

    res.json({
      data: rows,
      headers: ['ID Producto', 'Producto', 'Descripción', 'Precio', 'Stock', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email', 'Teléfono'],
      total: rows.length,
      description: 'Todos los proveedores (incluyendo los sin productos)'
    });
  } catch (error) {
    console.error('Error in RIGHT JOIN:', error);
    res.status(500).json({ error: 'Error en RIGHT JOIN' });
  }
});

// CROSS JOIN - Combinación completa de productos y proveedores
app.post('/api/joins/cross', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        p.Id as ProductoId,
        p.Nombre as ProductoNombre,
        p.Descripcion as ProductoDescripcion,
        p.Precio as ProductoPrecio,
        p.Stock as ProductoStock,
        p.Categoria as ProductoCategoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        pr.Telefono as ProveedorTelefono,
        CASE 
          WHEN p.ProveedorId = pr.Id THEN 'Asignado'
          ELSE 'No Asignado'
        END as EstadoAsignacion
      FROM Productos p
      CROSS JOIN Proveedores pr
      WHERE p.Activo = 1 AND pr.Activo = 1
      ORDER BY p.Nombre, pr.Nombre
      LIMIT 100
    `);

    res.json({
      data: rows,
      headers: ['ID Producto', 'Producto', 'Descripción', 'Precio', 'Stock', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email', 'Teléfono', 'Estado'],
      total: rows.length,
      description: 'Combinación completa de productos y proveedores (limitado a 100 registros)'
    });
  } catch (error) {
    console.error('Error in CROSS JOIN:', error);
    res.status(500).json({ error: 'Error en CROSS JOIN' });
  }
});

// FULL OUTER JOIN simulado - Unión de LEFT y RIGHT JOIN
app.post('/api/joins/full', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        p.Id as ProductoId,
        p.Nombre as ProductoNombre,
        p.Descripcion as ProductoDescripcion,
        p.Precio as ProductoPrecio,
        p.Stock as ProductoStock,
        p.Categoria as ProductoCategoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        pr.Telefono as ProveedorTelefono,
        'Producto con Proveedor' as TipoRegistro
       FROM Productos p 
       LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id 
      WHERE p.Activo = 1
      
      UNION
      
      SELECT 
        NULL as ProductoId,
        'Sin productos' as ProductoNombre,
        'N/A' as ProductoDescripcion,
        0 as ProductoPrecio,
        0 as ProductoStock,
        'N/A' as ProductoCategoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        pr.Telefono as ProveedorTelefono,
        'Proveedor sin Productos' as TipoRegistro
      FROM Proveedores pr
      WHERE pr.Activo = 1 
      AND NOT EXISTS (
        SELECT 1 FROM Productos p 
        WHERE p.ProveedorId = pr.Id AND p.Activo = 1
      )
      
      ORDER BY ProductoNombre, ProveedorNombre
    `);

    res.json({
      data: rows,
      headers: ['ID Producto', 'Producto', 'Descripción', 'Precio', 'Stock', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email', 'Teléfono', 'Tipo'],
      total: rows.length,
      description: 'FULL OUTER JOIN simulado - Todos los productos y proveedores'
    });
  } catch (error) {
    console.error('Error in FULL OUTER JOIN:', error);
    res.status(500).json({ error: 'Error en FULL OUTER JOIN' });
  }
});

// Estadísticas avanzadas con JOINs
app.post('/api/joins/stats', async (req, res) => {
  try {
    // Estadísticas por proveedor
    const [statsPorProveedor] = await mysqlPromise.execute(`
      SELECT 
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        COUNT(p.Id) as TotalProductos,
        AVG(p.Precio) as PrecioPromedio,
        SUM(p.Stock) as StockTotal,
        MIN(p.Precio) as PrecioMinimo,
        MAX(p.Precio) as PrecioMaximo,
        SUM(p.Stock * p.Precio) as ValorTotalInventario
      FROM Proveedores pr
      LEFT JOIN Productos p ON pr.Id = p.ProveedorId AND p.Activo = 1
      WHERE pr.Activo = 1
      GROUP BY pr.Id, pr.Nombre, pr.Email
      ORDER BY TotalProductos DESC
    `);

    // Estadísticas por categoría
    const [statsPorCategoria] = await mysqlPromise.execute(`
      SELECT 
        p.Categoria,
        COUNT(p.Id) as TotalProductos,
        AVG(p.Precio) as PrecioPromedio,
        SUM(p.Stock) as StockTotal,
        COUNT(DISTINCT p.ProveedorId) as ProveedoresUnicos,
        MIN(p.Precio) as PrecioMinimo,
        MAX(p.Precio) as PrecioMaximo,
        SUM(p.Stock * p.Precio) as ValorTotalInventario
      FROM Productos p
      WHERE p.Activo = 1 AND p.Categoria IS NOT NULL AND p.Categoria != ''
      GROUP BY p.Categoria
      ORDER BY TotalProductos DESC
    `);

    // Análisis de productos sin proveedor
    const [productosSinProveedor] = await mysqlPromise.execute(`
      SELECT 
        COUNT(*) as TotalProductosSinProveedor,
        AVG(Precio) as PrecioPromedioSinProveedor,
        SUM(Stock) as StockTotalSinProveedor
      FROM Productos p
      WHERE p.Activo = 1 AND p.ProveedorId IS NULL
    `);

    // Análisis de proveedores sin productos
    const [proveedoresSinProductos] = await mysqlPromise.execute(`
      SELECT 
        COUNT(*) as TotalProveedoresSinProductos
      FROM Proveedores pr
      WHERE pr.Activo = 1 
      AND NOT EXISTS (
        SELECT 1 FROM Productos p 
        WHERE p.ProveedorId = pr.Id AND p.Activo = 1
      )
    `);

    res.json({
      estadisticas: {
        porProveedor: statsPorProveedor,
        porCategoria: statsPorCategoria,
        productosSinProveedor: productosSinProveedor[0],
        proveedoresSinProductos: proveedoresSinProductos[0]
      },
      total: {
        proveedores: statsPorProveedor.length,
        categorias: statsPorCategoria.length
      },
      description: 'Análisis estadístico completo con JOINs'
    });
  } catch (error) {
    console.error('Error in JOINs stats:', error);
    res.status(500).json({ error: 'Error en estadísticas de JOINs' });
  }
});

// JOIN con múltiples tablas - Ventas con productos y proveedores
app.post('/api/joins/ventas-completas', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        v.Id as VentaId,
        v.FechaVenta,
        v.Total as TotalVenta,
        v.MetodoPago,
        v.Estado as EstadoVenta,
        dv.Cantidad,
        dv.PrecioUnitario,
        dv.Subtotal,
        p.Id as ProductoId,
        p.Nombre as ProductoNombre,
        p.Categoria as ProductoCategoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail
      FROM Ventas v
      INNER JOIN DetalleVenta dv ON v.Id = dv.VentaId
      INNER JOIN Productos p ON dv.ProductoId = p.Id
      LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id
      WHERE v.Estado = 'Completada'
      ORDER BY v.FechaVenta DESC
      LIMIT 50
    `);

    res.json({
      data: rows,
      headers: ['ID Venta', 'Fecha', 'Total', 'Método Pago', 'Estado', 'Cantidad', 'Precio Unit.', 'Subtotal', 'ID Producto', 'Producto', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email'],
      total: rows.length,
      description: 'Ventas completas con productos y proveedores'
    });
  } catch (error) {
    console.error('Error in ventas completas JOIN:', error);
    res.status(500).json({ error: 'Error en ventas completas' });
  }
});

// JOIN con compras y proveedores
app.post('/api/joins/compras-completas', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        c.Id as CompraId,
        c.FechaCompra,
        c.Total as TotalCompra,
        c.MetodoPago,
        c.Estado as EstadoCompra,
        dc.Cantidad,
        dc.PrecioUnitario,
        dc.Subtotal,
        p.Id as ProductoId,
        p.Nombre as ProductoNombre,
        p.Categoria as ProductoCategoria,
        pr.Id as ProveedorId,
        pr.Nombre as ProveedorNombre,
        pr.Email as ProveedorEmail,
        pr.Telefono as ProveedorTelefono
      FROM Compras c
      INNER JOIN DetalleCompra dc ON c.Id = dc.CompraId
      INNER JOIN Productos p ON dc.ProductoId = p.Id
      INNER JOIN Proveedores pr ON c.ProveedorId = pr.Id
      WHERE c.Estado = 'Completada'
      ORDER BY c.FechaCompra DESC
      LIMIT 50
    `);

    res.json({
      data: rows,
      headers: ['ID Compra', 'Fecha', 'Total', 'Método Pago', 'Estado', 'Cantidad', 'Precio Unit.', 'Subtotal', 'ID Producto', 'Producto', 'Categoría', 'ID Proveedor', 'Proveedor', 'Email', 'Teléfono'],
      total: rows.length,
      description: 'Compras completas con productos y proveedores'
    });
  } catch (error) {
    console.error('Error in compras completas JOIN:', error);
    res.status(500).json({ error: 'Error en compras completas' });
  }
});

// CROSS JOIN para análisis de precios por proveedor y categoría
app.post('/api/joins/analisis-precios', async (req, res) => {
  try {
    const [rows] = await mysqlPromise.execute(`
      SELECT 
        pr.Nombre as ProveedorNombre,
        p.Categoria,
        COUNT(p.Id) as TotalProductos,
        AVG(p.Precio) as PrecioPromedio,
        MIN(p.Precio) as PrecioMinimo,
        MAX(p.Precio) as PrecioMaximo,
        SUM(p.Stock) as StockTotal,
        SUM(p.Stock * p.Precio) as ValorInventario
      FROM Proveedores pr
      CROSS JOIN (
        SELECT DISTINCT Categoria 
        FROM Productos 
        WHERE Categoria IS NOT NULL AND Categoria != '' AND Activo = 1
      ) cat
      LEFT JOIN Productos p ON pr.Id = p.ProveedorId AND p.Categoria = cat.Categoria AND p.Activo = 1
      WHERE pr.Activo = 1
      GROUP BY pr.Id, pr.Nombre, cat.Categoria
      ORDER BY pr.Nombre, cat.Categoria
    `);

    res.json({
      data: rows,
      headers: ['Proveedor', 'Categoría', 'Total Productos', 'Precio Promedio', 'Precio Mínimo', 'Precio Máximo', 'Stock Total', 'Valor Inventario'],
      total: rows.length,
      description: 'Análisis de precios por proveedor y categoría'
    });
  } catch (error) {
    console.error('Error in análisis de precios:', error);
    res.status(500).json({ error: 'Error en análisis de precios' });
  }
});

// Serve React app - IMPORTANTE: Esto debe ir al final
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
async function startServer() {
  console.log('🚀 Starting Papeleria San Nicolas server...');
  console.log(`📊 Database: ${process.env.MYSQL_DATABASE}`);
  
  const dbConnected = await testDatabase();
  
  // Función para verificar si un puerto está disponible
  async function isPortAvailable(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }
  
  // Función para encontrar un puerto disponible
  async function findAvailablePort(startPort) {
    let port = startPort;
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (await isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    return null;
  }
  
  // Función para obtener información del proceso que usa el puerto
  async function getProcessInfo(port) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      let command;
      if (process.platform === 'win32') {
        command = `netstat -ano | findstr :${port}`;
      } else {
        command = `lsof -ti:${port}`;
      }
      
      const { stdout } = await execAsync(command);
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }
  
  // Función para mostrar instrucciones de liberación de puerto
  function showPortReleaseInstructions(port, processInfo) {
    console.log('\n🔧 INSTRUCCIONES PARA LIBERAR EL PUERTO:');
    console.log('==========================================');
    
    if (process.platform === 'win32') {
      console.log(`\n📋 En Windows:`);
      console.log(`1. Abre el Administrador de tareas (Ctrl + Shift + Esc)`);
      console.log(`2. Ve a la pestaña "Detalles" o "Procesos"`);
      console.log(`3. Busca el proceso con PID: ${processInfo || 'desconocido'}`);
      console.log(`4. Haz clic derecho y selecciona "Finalizar tarea"`);
      console.log(`\n💻 O desde la línea de comandos:`);
      console.log(`   taskkill /F /PID ${processInfo || 'PID_DEL_PROCESO'}`);
      console.log(`   taskkill /F /IM node.exe`);
    } else {
      console.log(`\n📋 En Linux/Mac:`);
      console.log(`1. Encuentra el proceso: lsof -ti:${port}`);
      console.log(`2. Mata el proceso: kill -9 ${processInfo || 'PID_DEL_PROCESO'}`);
      console.log(`\n💻 O desde la línea de comandos:`);
      console.log(`   sudo kill -9 $(lsof -ti:${port})`);
    }
    
    console.log(`\n🔄 Después de liberar el puerto, ejecuta:`);
    console.log(`   node server.js`);
  }
  
  try {
    // Verificar si el puerto configurado está disponible
    const portAvailable = await isPortAvailable(PORT);
    
    if (!portAvailable) {
      console.log(`\n⚠️  Puerto ${PORT} ya está en uso`);
      
      // Obtener información del proceso
      const processInfo = await getProcessInfo(PORT);
      
      if (processInfo) {
        console.log(`📊 Proceso usando el puerto ${PORT}:`);
        console.log(`   ${processInfo}`);
      }
      
      // Buscar un puerto alternativo
      console.log(`\n🔍 Buscando puerto alternativo...`);
      const alternativePort = await findAvailablePort(parseInt(PORT) + 1);
      
      if (alternativePort) {
        console.log(`✅ Puerto ${alternativePort} disponible`);
        console.log(`\n💡 OPCIONES:`);
        console.log(`1. Usar puerto alternativo ${alternativePort}`);
        console.log(`2. Liberar el puerto ${PORT} actual`);
        
        // Actualizar la variable PORT
        const originalPort = PORT;
        PORT = alternativePort;
        
        console.log(`\n🚀 Iniciando servidor en puerto alternativo ${PORT}...`);
        console.log(`⚠️  NOTA: El frontend debe configurarse para usar el puerto ${PORT}`);
        console.log(`   Actualiza vite.config.js: target: 'http://localhost:${PORT}'`);
        
        // Mostrar instrucciones para liberar el puerto original
        showPortReleaseInstructions(originalPort, processInfo);
      } else {
        console.log(`❌ No se encontró ningún puerto disponible en el rango ${PORT}-${PORT + 10}`);
        showPortReleaseInstructions(PORT, processInfo);
        process.exit(1);
      }
    }
    
    // Crear el servidor con manejo de errores
    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 Production Mode: http://localhost:${PORT}`);
        console.log(`🔗 API: http://localhost:${PORT}/api`);
        console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
      } else {
        console.log(`🌐 Development Mode:`);
        console.log(`   Frontend: http://localhost:3000`);
        console.log(`   Backend API: http://localhost:${PORT}/api`);
        console.log(`   API Health: http://localhost:${PORT}/api/health`);
      }
    console.log('');
    console.log('📝 APIs disponibles:');
    console.log('  GET  /api/health - Estado del servidor');
    console.log('  GET  /api/estadisticas - Estadísticas generales');
    console.log('  GET  /api/productos - Lista de productos');
    console.log('  POST /api/productos - Agregar producto');
    console.log('  PUT  /api/productos/:id - Actualizar producto');
    console.log('  DELETE /api/productos/:id - Eliminar producto');
    console.log('  GET  /api/proveedores - Lista de proveedores');
    console.log('  POST /api/proveedores - Agregar proveedor');
    console.log('  PUT  /api/proveedores/:id - Actualizar proveedor');
    console.log('  DELETE /api/proveedores/:id - Eliminar proveedor');
    console.log('  GET  /api/ventas - Lista de ventas');
    console.log('  POST /api/ventas - Registrar venta');
    console.log('  PUT  /api/ventas/:id - Actualizar venta');
    console.log('  DELETE /api/ventas/:id - Eliminar venta');
    console.log('  GET  /api/productos/stock-bajo - Productos con stock bajo');
    console.log('  GET  /api/productos/buscar?q=term - Buscar productos');
    console.log('  GET  /api/categorias - Lista de categorías');
    
    if (!dbConnected) {
      console.log('⚠️  Warning: Database connection failed. Some features may not work.');
    }
      
      console.log('\n🎉 ¡Servidor iniciado exitosamente!');
    });
    
    // Manejar errores del servidor
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`\n❌ Error: Puerto ${PORT} ya está en uso`);
        console.log(`💡 El servidor no pudo iniciarse en el puerto ${PORT}`);
        
        getProcessInfo(PORT).then(processInfo => {
          showPortReleaseInstructions(PORT, processInfo);
        });
        
        process.exit(1);
      } else {
        console.error('❌ Error del servidor:', error.message);
        process.exit(1);
      }
    });
    
    // Manejar cierre del servidor
    server.on('close', () => {
      console.log('\n🔌 Servidor cerrado');
    });
    
    // Manejar señales de terminación
    process.on('SIGINT', () => {
      console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Error durante el inicio del servidor:', error.message);
    process.exit(1);
  }
}

startServer().catch(console.error); 