const express = require('express');
const router = express.Router();
const {
    getVentas,
    getVentaById,
    createVenta,
    updateEstadoVenta
} = require('../controllers/ventaController');

// Rutas
router.get('/', getVentas);
router.get('/:id', getVentaById);
router.post('/', createVenta);
router.patch('/:id/estado', updateEstadoVenta);

module.exports = router;
