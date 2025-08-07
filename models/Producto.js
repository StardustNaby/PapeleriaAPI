const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    precio: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        default: 0
    },
    stockMinimo: {
        type: Number,
        default: 5
    },
    categoria: String,
    codigoBarras: {
        type: String,
        unique: true,
        sparse: true
    },
    proveedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proveedor'
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices
productoSchema.index({ nombre: 1 });
productoSchema.index({ categoria: 1 });
productoSchema.index({ stock: 1 });

module.exports = mongoose.model('Producto', productoSchema);
