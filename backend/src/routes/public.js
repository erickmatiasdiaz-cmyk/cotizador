const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/configuracion', publicController.getConfiguracion);
router.get('/productos', publicController.getProductos);
router.post('/pedido', publicController.solicitarPedido);

module.exports = router;
