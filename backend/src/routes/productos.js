const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', productoController.getAll);
router.get('/categorias', productoController.getCategorias);
router.get('/:id', productoController.getById);
router.post('/', productoController.create);
router.post('/importar', productoController.importarMasivamente);
router.put('/:id', productoController.update);
router.delete('/:id', productoController.delete);

module.exports = router;
