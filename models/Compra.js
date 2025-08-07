const mongoose = require('mongoose');

const detalleCompraSchema = new mongoose.Schema({
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

const compraSchema = new mongoose.Schema({
    proveedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proveedor',
        required: true
    },
    fechaCompra: {
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
        default: 'Pendiente'
    },
    observaciones: String,
    detalles: [detalleCompraSchema]
}, {
    timestamps: true
});

// Índices
compraSchema.index({ fechaCompra: -1 });
compraSchema.index({ proveedor: 1 });

module.exports = mongoose.model('Compra', compraSchema);
