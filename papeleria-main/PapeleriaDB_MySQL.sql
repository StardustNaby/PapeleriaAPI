-- =============================================
-- SISTEMA DE GESTIÓN DE PAPELERÍA - MySQL
-- Base de Datos Completa para Node.js
-- =============================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS carlospapeleriagongoraeuan;
USE carlospapeleriagongoraeuan;

-- =============================================
-- CREAR TABLAS
-- =============================================

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS Proveedores (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Email VARCHAR(100),
    Telefono VARCHAR(20),
    Direccion VARCHAR(200),
    FechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Activo BOOLEAN DEFAULT TRUE
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS Productos (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    Precio DECIMAL(10,2) NOT NULL,
    Stock INT DEFAULT 0,
    StockMinimo INT DEFAULT 5,
    Categoria VARCHAR(50),
    CodigoBarras VARCHAR(50) UNIQUE,
    ProveedorId INT,
    FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (ProveedorId) REFERENCES Proveedores(Id)
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS Ventas (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Cliente VARCHAR(100) NOT NULL,
    FechaVenta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Total DECIMAL(10,2) DEFAULT 0,
    MetodoPago VARCHAR(50) DEFAULT 'Efectivo',
    Estado VARCHAR(20) DEFAULT 'Completada'
);

-- Tabla de Detalles de Venta
CREATE TABLE IF NOT EXISTS DetalleVenta (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    VentaId INT NOT NULL,
    ProductoId INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (VentaId) REFERENCES Ventas(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

-- Tabla de Compras
CREATE TABLE IF NOT EXISTS Compras (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ProveedorId INT NOT NULL,
    FechaCompra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Total DECIMAL(10,2) DEFAULT 0,
    MetodoPago VARCHAR(50) DEFAULT 'Efectivo',
    Estado VARCHAR(20) DEFAULT 'Pendiente',
    Observaciones TEXT,
    FOREIGN KEY (ProveedorId) REFERENCES Proveedores(Id)
);

-- Tabla de Detalles de Compra
CREATE TABLE IF NOT EXISTS DetalleCompra (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CompraId INT NOT NULL,
    ProductoId INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (CompraId) REFERENCES Compras(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

-- =============================================
-- CREAR ÍNDICES
-- =============================================

CREATE INDEX IX_Productos_Nombre ON Productos(Nombre);
CREATE INDEX IX_Productos_Categoria ON Productos(Categoria);
CREATE INDEX IX_Productos_Stock ON Productos(Stock);
CREATE INDEX IX_Ventas_Fecha ON Ventas(FechaVenta);
CREATE INDEX IX_Proveedores_Nombre ON Proveedores(Nombre);
CREATE INDEX IX_Compras_Fecha ON Compras(FechaCompra);

-- =============================================
-- STORED PROCEDURES
-- =============================================

DELIMITER //

-- Procedimiento para mostrar productos
CREATE PROCEDURE sp_MostrarProductos()
BEGIN
    SELECT 
        p.Id,
        p.Nombre,
        p.Descripcion,
        p.Precio,
        p.Stock,
        p.StockMinimo,
        p.Categoria,
        p.CodigoBarras,
        p.ProveedorId,
        pr.Nombre as ProveedorNombre
    FROM Productos p
    LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id
    WHERE p.Activo = TRUE
    ORDER BY p.Nombre;
END //

-- Procedimiento para obtener producto por ID
CREATE PROCEDURE sp_ObtenerProducto(IN productId INT)
BEGIN
    SELECT 
        p.Id,
        p.Nombre,
        p.Descripcion,
        p.Precio,
        p.Stock,
        p.StockMinimo,
        p.Categoria,
        p.CodigoBarras,
        p.ProveedorId,
        pr.Nombre as ProveedorNombre
    FROM Productos p
    LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id
    WHERE p.Id = productId AND p.Activo = TRUE;
END //

-- Procedimiento para insertar producto
CREATE PROCEDURE sp_InsertarProducto(
    IN pNombre VARCHAR(100),
    IN pDescripcion TEXT,
    IN pPrecio DECIMAL(10,2),
    IN pStock INT,
    IN pStockMinimo INT,
    IN pCategoria VARCHAR(50),
    IN pCodigoBarras VARCHAR(50),
    IN pProveedorId INT
)
BEGIN
    INSERT INTO Productos (Nombre, Descripcion, Precio, Stock, StockMinimo, Categoria, CodigoBarras, ProveedorId)
    VALUES (pNombre, pDescripcion, pPrecio, pStock, pStockMinimo, pCategoria, pCodigoBarras, pProveedorId);
    
    SELECT LAST_INSERT_ID() as IdInsertado;
END //

-- Procedimiento para actualizar producto
CREATE PROCEDURE sp_ActualizarProducto(
    IN pId INT,
    IN pNombre VARCHAR(100),
    IN pDescripcion TEXT,
    IN pPrecio DECIMAL(10,2),
    IN pStock INT,
    IN pStockMinimo INT,
    IN pCategoria VARCHAR(50),
    IN pCodigoBarras VARCHAR(50),
    IN pProveedorId INT
)
BEGIN
    UPDATE Productos 
    SET Nombre = pNombre,
        Descripcion = pDescripcion,
        Precio = pPrecio,
        Stock = pStock,
        StockMinimo = pStockMinimo,
        Categoria = pCategoria,
        CodigoBarras = pCodigoBarras,
        ProveedorId = pProveedorId
    WHERE Id = pId AND Activo = TRUE;
    
    SELECT ROW_COUNT() as FilasActualizadas;
END //

-- Procedimiento para eliminar producto (soft delete)
CREATE PROCEDURE sp_EliminarProducto(IN pId INT)
BEGIN
    UPDATE Productos SET Activo = FALSE WHERE Id = pId;
    SELECT ROW_COUNT() as FilasEliminadas;
END //

-- Procedimiento para productos con bajo stock
CREATE PROCEDURE sp_ProductosBajoStock()
BEGIN
    SELECT 
        p.Id,
        p.Nombre,
        p.Descripcion,
        p.Precio,
        p.Stock,
        p.StockMinimo,
        p.Categoria,
        pr.Nombre as ProveedorNombre
    FROM Productos p
    LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id
    WHERE p.Stock <= p.StockMinimo AND p.Activo = TRUE
    ORDER BY p.Stock ASC;
END //

-- Procedimiento para buscar productos
CREATE PROCEDURE sp_BuscarProductos(IN searchTerm VARCHAR(100))
BEGIN
    SELECT 
        p.Id,
        p.Nombre,
        p.Descripcion,
        p.Precio,
        p.Stock,
        p.StockMinimo,
        p.Categoria,
        p.CodigoBarras,
        pr.Nombre as ProveedorNombre
    FROM Productos p
    LEFT JOIN Proveedores pr ON p.ProveedorId = pr.Id
    WHERE p.Activo = TRUE 
    AND (p.Nombre LIKE searchTerm OR p.Descripcion LIKE searchTerm OR p.Categoria LIKE searchTerm)
    ORDER BY p.Nombre;
END //

-- Procedimiento para mostrar proveedores
CREATE PROCEDURE sp_MostrarProveedores()
BEGIN
    SELECT Id, Nombre, Email, Telefono, Direccion, FechaRegistro
    FROM Proveedores 
    WHERE Activo = TRUE
    ORDER BY Nombre;
END //

-- Procedimiento para obtener proveedor por ID
CREATE PROCEDURE sp_ObtenerProveedor(IN providerId INT)
BEGIN
    SELECT Id, Nombre, Email, Telefono, Direccion, FechaRegistro
    FROM Proveedores 
    WHERE Id = providerId AND Activo = TRUE;
END //

-- Procedimiento para insertar proveedor
CREATE PROCEDURE sp_InsertarProveedor(
    IN pNombre VARCHAR(100),
    IN pEmail VARCHAR(100),
    IN pTelefono VARCHAR(20),
    IN pDireccion VARCHAR(200)
)
BEGIN
    INSERT INTO Proveedores (Nombre, Email, Telefono, Direccion)
    VALUES (pNombre, pEmail, pTelefono, pDireccion);
    
    SELECT LAST_INSERT_ID() as IdInsertado;
END //

-- Procedimiento para actualizar proveedor
CREATE PROCEDURE sp_ActualizarProveedor(
    IN pId INT,
    IN pNombre VARCHAR(100),
    IN pEmail VARCHAR(100),
    IN pTelefono VARCHAR(20),
    IN pDireccion VARCHAR(200)
)
BEGIN
    UPDATE Proveedores 
    SET Nombre = pNombre,
        Email = pEmail,
        Telefono = pTelefono,
        Direccion = pDireccion
    WHERE Id = pId AND Activo = TRUE;
    
    SELECT ROW_COUNT() as FilasActualizadas;
END //

-- Procedimiento para eliminar proveedor (soft delete)
CREATE PROCEDURE sp_EliminarProveedor(IN pId INT)
BEGIN
    UPDATE Proveedores SET Activo = FALSE WHERE Id = pId;
    SELECT ROW_COUNT() as FilasEliminadas;
END //

-- Procedimiento para mostrar ventas
CREATE PROCEDURE sp_MostrarVentas()
BEGIN
    SELECT Id, Cliente, FechaVenta, Total, MetodoPago, Estado
    FROM Ventas
    ORDER BY FechaVenta DESC;
END //

-- Procedimiento para obtener venta por ID
CREATE PROCEDURE sp_ObtenerVenta(IN saleId INT)
BEGIN
    SELECT Id, Cliente, FechaVenta, Total, MetodoPago, Estado
    FROM Ventas 
    WHERE Id = saleId;
END //

-- Procedimiento para insertar venta
CREATE PROCEDURE sp_InsertarVenta(
    IN pCliente VARCHAR(100),
    IN pTotal DECIMAL(10,2),
    IN pMetodoPago VARCHAR(50),
    IN pEstado VARCHAR(20)
)
BEGIN
    INSERT INTO Ventas (Cliente, Total, MetodoPago, Estado)
    VALUES (pCliente, pTotal, pMetodoPago, pEstado);
    
    SELECT LAST_INSERT_ID() as IdInsertado;
END //

-- Procedimiento para actualizar venta
CREATE PROCEDURE sp_ActualizarVenta(
    IN pId INT,
    IN pCliente VARCHAR(100),
    IN pTotal DECIMAL(10,2),
    IN pMetodoPago VARCHAR(50),
    IN pEstado VARCHAR(20)
)
BEGIN
    UPDATE Ventas 
    SET Cliente = pCliente,
        Total = pTotal,
        MetodoPago = pMetodoPago,
        Estado = pEstado
    WHERE Id = pId;
    
    SELECT ROW_COUNT() as FilasActualizadas;
END //

-- Procedimiento para eliminar venta
CREATE PROCEDURE sp_EliminarVenta(IN pId INT)
BEGIN
    DELETE FROM Ventas WHERE Id = pId;
    SELECT ROW_COUNT() as FilasEliminadas;
END //

-- Procedimiento para ventas por día
CREATE PROCEDURE sp_VentasPorDia(IN pDias INT)
BEGIN
    SELECT 
        DATE(FechaVenta) as Fecha,
        COUNT(*) as TotalVentas,
        SUM(Total) as TotalIngresos
    FROM Ventas
    WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL pDias DAY)
    GROUP BY DATE(FechaVenta)
    ORDER BY Fecha DESC;
END //

-- Procedimiento para mostrar compras
CREATE PROCEDURE sp_MostrarCompras()
BEGIN
    SELECT 
        c.Id,
        c.FechaCompra,
        c.Total,
        c.MetodoPago,
        c.Estado,
        c.Observaciones,
        p.Nombre as ProveedorNombre
    FROM Compras c
    LEFT JOIN Proveedores p ON c.ProveedorId = p.Id
    ORDER BY c.FechaCompra DESC;
END //

-- Procedimiento para obtener compra por ID
CREATE PROCEDURE sp_ObtenerCompra(IN purchaseId INT)
BEGIN
    SELECT 
        c.Id,
        c.FechaCompra,
        c.Total,
        c.MetodoPago,
        c.Estado,
        c.Observaciones,
        p.Nombre as ProveedorNombre
    FROM Compras c
    LEFT JOIN Proveedores p ON c.ProveedorId = p.Id
    WHERE c.Id = purchaseId;
END //

-- Procedimiento para insertar compra
CREATE PROCEDURE sp_InsertarCompra(
    IN pProveedorId INT,
    IN pTotal DECIMAL(10,2),
    IN pMetodoPago VARCHAR(50),
    IN pEstado VARCHAR(20),
    IN pObservaciones TEXT
)
BEGIN
    INSERT INTO Compras (ProveedorId, Total, MetodoPago, Estado, Observaciones)
    VALUES (pProveedorId, pTotal, pMetodoPago, pEstado, pObservaciones);
    
    SELECT LAST_INSERT_ID() as IdInsertado;
END //

-- Procedimiento para actualizar compra
CREATE PROCEDURE sp_ActualizarCompra(
    IN pId INT,
    IN pProveedorId INT,
    IN pTotal DECIMAL(10,2),
    IN pMetodoPago VARCHAR(50),
    IN pEstado VARCHAR(20),
    IN pObservaciones TEXT
)
BEGIN
    UPDATE Compras 
    SET ProveedorId = pProveedorId,
        Total = pTotal,
        MetodoPago = pMetodoPago,
        Estado = pEstado,
        Observaciones = pObservaciones
    WHERE Id = pId;
    
    SELECT ROW_COUNT() as FilasActualizadas;
END //

-- Procedimiento para eliminar compra
CREATE PROCEDURE sp_EliminarCompra(IN pId INT)
BEGIN
    DELETE FROM Compras WHERE Id = pId;
    SELECT ROW_COUNT() as FilasEliminadas;
END //

-- Procedimiento para obtener categorías
CREATE PROCEDURE sp_ObtenerCategorias()
BEGIN
    SELECT DISTINCT Categoria
    FROM Productos
    WHERE Categoria IS NOT NULL AND Categoria != '' AND Activo = TRUE
    ORDER BY Categoria;
END //

-- Procedimiento para estadísticas generales
CREATE PROCEDURE sp_EstadisticasGenerales()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM Productos WHERE Activo = TRUE) as TotalProductos,
        (SELECT COUNT(*) FROM Proveedores WHERE Activo = TRUE) as TotalProveedores,
        (SELECT COUNT(*) FROM Ventas) as TotalVentas,
        (SELECT COUNT(*) FROM Compras) as TotalCompras,
        (SELECT SUM(Total) FROM Ventas) as IngresosTotales,
        (SELECT SUM(Total) FROM Compras) as GastosTotales,
        (SELECT COUNT(*) FROM Productos WHERE Stock <= StockMinimo AND Activo = TRUE) as ProductosBajoStock;
END //

-- Procedimiento para actualizar stock de producto
CREATE PROCEDURE sp_ActualizarStockProducto(IN pProductoId INT, IN pCantidad INT)
BEGIN
    UPDATE Productos 
    SET Stock = Stock + pCantidad
    WHERE Id = pProductoId AND Activo = TRUE;
END //

-- Procedimiento para obtener stock de producto
CREATE PROCEDURE sp_ObtenerStockProducto(IN pProductoId INT)
BEGIN
    SELECT Stock FROM Productos WHERE Id = pProductoId AND Activo = TRUE;
END //

-- Procedimiento para insertar detalle de venta
CREATE PROCEDURE sp_InsertarDetalleVenta(
    IN pVentaId INT,
    IN pProductoId INT,
    IN pCantidad INT,
    IN pPrecioUnitario DECIMAL(10,2),
    IN pSubtotal DECIMAL(10,2)
)
BEGIN
    INSERT INTO DetalleVenta (VentaId, ProductoId, Cantidad, PrecioUnitario, Subtotal)
    VALUES (pVentaId, pProductoId, pCantidad, pPrecioUnitario, pSubtotal);
END //

-- Procedimiento para insertar detalle de compra
CREATE PROCEDURE sp_InsertarDetalleCompra(
    IN pCompraId INT,
    IN pProductoId INT,
    IN pCantidad INT,
    IN pPrecioUnitario DECIMAL(10,2),
    IN pSubtotal DECIMAL(10,2)
)
BEGIN
    INSERT INTO DetalleCompra (CompraId, ProductoId, Cantidad, PrecioUnitario, Subtotal)
    VALUES (pCompraId, pProductoId, pCantidad, pPrecioUnitario, pSubtotal);
END //

-- Procedimiento para obtener total de venta
CREATE PROCEDURE sp_ObtenerTotalVenta(IN pVentaId INT)
BEGIN
    SELECT SUM(Subtotal) as Total
    FROM DetalleVenta
    WHERE VentaId = pVentaId;
END //

-- Procedimiento para obtener detalles de compra
CREATE PROCEDURE sp_ObtenerDetallesCompra(IN pCompraId INT)
BEGIN
    SELECT 
        dc.Id,
        dc.CompraId,
        dc.ProductoId,
        dc.Cantidad,
        dc.PrecioUnitario,
        dc.Subtotal,
        p.Nombre as ProductoNombre
    FROM DetalleCompra dc
    LEFT JOIN Productos p ON dc.ProductoId = p.Id
    WHERE dc.CompraId = pCompraId;
END //

-- Procedimiento para eliminar detalles de compra
CREATE PROCEDURE sp_EliminarDetallesCompra(IN pCompraId INT)
BEGIN
    DELETE FROM DetalleCompra WHERE CompraId = pCompraId;
END //

DELIMITER ;

-- =============================================
-- INSERTAR DATOS DE EJEMPLO
-- =============================================

-- Insertar proveedores de ejemplo
INSERT INTO Proveedores (Nombre, Email, Telefono, Direccion) VALUES
('Papelería Central', 'central@papeleria.com', '555-0101', 'Av. Principal 123'),
('Suministros Escolares', 'suministros@escuela.com', '555-0202', 'Calle Secundaria 456'),
('Arte y Manualidades', 'arte@manualidades.com', '555-0303', 'Plaza Comercial 789'),
('Tecnología Educativa', 'tecnologia@edu.com', '555-0404', 'Centro Tecnológico 321'),
('Oficina Profesional', 'oficina@prof.com', '555-0505', 'Zona Empresarial 654');

-- Insertar productos de ejemplo
INSERT INTO Productos (Nombre, Descripcion, Precio, Stock, StockMinimo, Categoria, ProveedorId) VALUES
('Lápiz HB', 'Lápiz grafito HB para escritura', 0.50, 100, 20, 'Escritura', 1),
('Cuaderno A4', 'Cuaderno de 100 hojas tamaño A4', 2.50, 50, 10, 'Papelería', 1),
('Marcador Negro', 'Marcador permanente negro', 1.20, 75, 15, 'Escritura', 2),
('Tijeras Escolares', 'Tijeras de punta roma para niños', 3.00, 30, 5, 'Herramientas', 2),
('Pegamento Blanco', 'Pegamento escolar 100ml', 1.80, 60, 12, 'Adhesivos', 3),
('Cartulina Blanca', 'Cartulina blanca 50x70cm', 0.80, 200, 40, 'Arte y Manualidades', 3),
('Calculadora Básica', 'Calculadora científica básica', 8.50, 25, 5, 'Tecnología', 4),
('USB 16GB', 'Memoria USB 16GB', 12.00, 40, 8, 'Tecnología', 4),
('Organizador de Escritorio', 'Organizador plástico para escritorio', 15.00, 20, 4, 'Organización', 5),
('Grapadora', 'Grapadora metálica pequeña', 5.50, 35, 7, 'Oficina', 5);

-- Insertar ventas de ejemplo
INSERT INTO Ventas (Cliente, Total, MetodoPago, Estado) VALUES
('María González', 15.50, 'Efectivo', 'Completada'),
('Juan Pérez', 8.75, 'Tarjeta', 'Completada'),
('Ana Rodríguez', 22.30, 'Efectivo', 'Completada'),
('Carlos López', 12.00, 'Tarjeta', 'Completada'),
('Laura Martínez', 18.90, 'Efectivo', 'Completada');

-- Insertar compras de ejemplo
INSERT INTO Compras (ProveedorId, Total, MetodoPago, Estado, Observaciones) VALUES
(1, 150.00, 'Transferencia', 'Completada', 'Compra mensual de papelería'),
(2, 85.50, 'Efectivo', 'Completada', 'Suministros escolares'),
(3, 120.00, 'Tarjeta', 'Pendiente', 'Materiales de arte'),
(4, 200.00, 'Transferencia', 'Completada', 'Equipos tecnológicos'),
(5, 95.25, 'Efectivo', 'Completada', 'Artículos de oficina');

COMMIT; 