const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    email: String,
    telefono: String,
    direccion: String,
    fechaRegistro: {
        type: Date,
        default: Date.now
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Proveedor', proveedorSchema);
