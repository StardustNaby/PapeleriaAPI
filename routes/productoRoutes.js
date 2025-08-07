const express = require('express');
const router = express.Router();
const {
    getProductos,
    getProductoById,
    createProducto,
    updateProducto,
    deleteProducto,
    updateStock
} = require('../controllers/productoController');

// Rutas
router.get('/', getProductos);
router.get('/:id', getProductoById);
router.post('/', createProducto);
router.put('/:id', updateProducto);
router.delete('/:id', deleteProducto);
router.patch('/:id/stock', updateStock);

module.exports = router;
