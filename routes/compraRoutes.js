const express = require('express');
const router = express.Router();
const {
    getCompras,
    getCompraById,
    createCompra,
    updateEstadoCompra
} = require('../controllers/compraController');

// Rutas
router.get('/', getCompras);
router.get('/:id', getCompraById);
router.post('/', createCompra);
router.patch('/:id/estado', updateEstadoCompra);

module.exports = router;
