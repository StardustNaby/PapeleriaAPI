const Proveedor = require('../models/Proveedor');

// Obtener todos los proveedores
exports.getProveedores = async (req, res) => {
    try {
        const proveedores = await Proveedor.find({ activo: true });
        res.json(proveedores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener un proveedor por ID
exports.getProveedorById = async (req, res) => {
    try {
        const proveedor = await Proveedor.findById(req.params.id);
        if (proveedor) {
            res.json(proveedor);
        } else {
            res.status(404).json({ message: 'Proveedor no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear un nuevo proveedor
exports.createProveedor = async (req, res) => {
    const proveedor = new Proveedor({
        nombre: req.body.nombre,
        email: req.body.email,
        telefono: req.body.telefono,
        direccion: req.body.direccion
    });

    try {
        const nuevoProveedor = await proveedor.save();
        res.status(201).json(nuevoProveedor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Actualizar un proveedor
exports.updateProveedor = async (req, res) => {
    try {
        const proveedor = await Proveedor.findById(req.params.id);
        if (proveedor) {
            Object.assign(proveedor, req.body);
            const proveedorActualizado = await proveedor.save();
            res.json(proveedorActualizado);
        } else {
            res.status(404).json({ message: 'Proveedor no encontrado' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Eliminar un proveedor (soft delete)
exports.deleteProveedor = async (req, res) => {
    try {
        const proveedor = await Proveedor.findById(req.params.id);
        if (proveedor) {
            proveedor.activo = false;
            await proveedor.save();
            res.json({ message: 'Proveedor eliminado' });
        } else {
            res.status(404).json({ message: 'Proveedor no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
