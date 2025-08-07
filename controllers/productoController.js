const Producto = require('../models/Producto');

// Obtener todos los productos
exports.getProductos = async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true })
            .populate('proveedor', 'nombre');
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener un producto por ID
exports.getProductoById = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id)
            .populate('proveedor', 'nombre');
        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear un nuevo producto
exports.createProducto = async (req, res) => {
    const producto = new Producto({
        nombre: req.body.nombre,
        descripcion: req.body.descripcion,
        precio: req.body.precio,
        stock: req.body.stock,
        stockMinimo: req.body.stockMinimo,
        categoria: req.body.categoria,
        codigoBarras: req.body.codigoBarras,
        proveedor: req.body.proveedor
    });

    try {
        const nuevoProducto = await producto.save();
        res.status(201).json(nuevoProducto);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Actualizar un producto
exports.updateProducto = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (producto) {
            Object.assign(producto, req.body);
            const productoActualizado = await producto.save();
            res.json(productoActualizado);
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Eliminar un producto (soft delete)
exports.deleteProducto = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (producto) {
            producto.activo = false;
            await producto.save();
            res.json({ message: 'Producto eliminado' });
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar stock
exports.updateStock = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (producto) {
            producto.stock = req.body.stock;
            await producto.save();
            res.json(producto);
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
