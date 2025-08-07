const mongoose = require('mongoose');

const detalleVentaSchema = new mongoose.Schema({
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    cantidad: {
        type: Number,
        required: true
    },
    precioUnitario: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    }
});

const ventaSchema = new mongoose.Schema({
    cliente: {
        type: String,
        required: true
    },
    fechaVenta: {
        type: Date,
        default: Date.now
    },
    total: {
        type: Number,
        default: 0
    },
    metodoPago: {
        type: String,
        default: 'Efectivo'
    },
    estado: {
        type: String,
        default: 'Completada'
    },
    detalles: [detalleVentaSchema]
}, {
    timestamps: true
});

// Índices
ventaSchema.index({ fechaVenta: -1 });
ventaSchema.index({ cliente: 1 });

module.exports = mongoose.model('Venta', ventaSchema);
