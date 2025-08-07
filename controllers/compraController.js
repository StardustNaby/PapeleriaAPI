const Compra = require('../models/Compra');
const Producto = require('../models/Producto');

// Obtener todas las compras
exports.getCompras = async (req, res) => {
    try {
        const compras = await Compra.find()
            .populate('proveedor', 'nombre')
            .populate({
                path: 'detalles.producto',
                select: 'nombre precio'
            });
        res.json(compras);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener una compra por ID
exports.getCompraById = async (req, res) => {
    try {
        const compra = await Compra.findById(req.params.id)
            .populate('proveedor', 'nombre')
            .populate({
                path: 'detalles.producto',
                select: 'nombre precio'
            });
        if (compra) {
            res.json(compra);
        } else {
            res.status(404).json({ message: 'Compra no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear una nueva compra
exports.createCompra = async (req, res) => {
    const session = await Compra.startSession();
    session.startTransaction();

    try {
        const { proveedor, metodoPago, observaciones, detalles } = req.body;
        
        // Calcular el total y actualizar stock
        let total = 0;
        for (let detalle of detalles) {
            const producto = await Producto.findById(detalle.producto);
            if (!producto) {
                throw new Error(`Producto ${detalle.producto} no encontrado`);
            }
            
            detalle.subtotal = detalle.precioUnitario * detalle.cantidad;
            total += detalle.subtotal;

            // Actualizar stock cuando la compra se complete
            if (req.body.estado === 'Completada') {
                producto.stock += detalle.cantidad;
                await producto.save({ session });
            }
        }

        const compra = new Compra({
            proveedor,
            metodoPago,
            observaciones,
            detalles,
            total,
            estado: req.body.estado || 'Pendiente'
        });

        const nuevaCompra = await compra.save({ session });
        await session.commitTransaction();
        
        res.status(201).json(nuevaCompra);
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// Actualizar estado de compra
exports.updateEstadoCompra = async (req, res) => {
    const session = await Compra.startSession();
    session.startTransaction();

    try {
        const compra = await Compra.findById(req.params.id);
        if (!compra) {
            return res.status(404).json({ message: 'Compra no encontrada' });
        }

        const estadoAnterior = compra.estado;
        compra.estado = req.body.estado;

        // Si la compra se completa, actualizar stock
        if (estadoAnterior !== 'Completada' && req.body.estado === 'Completada') {
            for (let detalle of compra.detalles) {
                const producto = await Producto.findById(detalle.producto);
                if (producto) {
                    producto.stock += detalle.cantidad;
                    await producto.save({ session });
                }
            }
        }

        const compraActualizada = await compra.save({ session });
        await session.commitTransaction();
        res.json(compraActualizada);
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};
