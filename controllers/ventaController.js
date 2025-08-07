const Venta = require('../models/Venta');
const Producto = require('../models/Producto');

// Obtener todas las ventas
exports.getVentas = async (req, res) => {
    try {
        const ventas = await Venta.find()
            .populate({
                path: 'detalles.producto',
                select: 'nombre precio'
            });
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener una venta por ID
exports.getVentaById = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id)
            .populate({
                path: 'detalles.producto',
                select: 'nombre precio'
            });
        if (venta) {
            res.json(venta);
        } else {
            res.status(404).json({ message: 'Venta no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear una nueva venta
exports.createVenta = async (req, res) => {
    const session = await Venta.startSession();
    session.startTransaction();

    try {
        const { cliente, metodoPago, detalles } = req.body;
        
        // Calcular el total y actualizar stock
        let total = 0;
        for (let detalle of detalles) {
            const producto = await Producto.findById(detalle.producto);
            if (!producto) {
                throw new Error(`Producto ${detalle.producto} no encontrado`);
            }
            if (producto.stock < detalle.cantidad) {
                throw new Error(`Stock insuficiente para ${producto.nombre}`);
            }
            
            detalle.precioUnitario = producto.precio;
            detalle.subtotal = producto.precio * detalle.cantidad;
            total += detalle.subtotal;

            // Actualizar stock
            producto.stock -= detalle.cantidad;
            await producto.save({ session });
        }

        const venta = new Venta({
            cliente,
            metodoPago,
            detalles,
            total
        });

        const nuevaVenta = await venta.save({ session });
        await session.commitTransaction();
        
        res.status(201).json(nuevaVenta);
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// Actualizar estado de venta
exports.updateEstadoVenta = async (req, res) => {
    try {
        const venta = await Venta.findById(req.params.id);
        if (venta) {
            venta.estado = req.body.estado;
            const ventaActualizada = await venta.save();
            res.json(ventaActualizada);
        } else {
            res.status(404).json({ message: 'Venta no encontrada' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
