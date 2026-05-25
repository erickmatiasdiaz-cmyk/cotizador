const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', productoController.getAll);
router.get('/categorias', productoController.getCategorias);
router.get('/:id', productoController.getById);
router.post('/', requireAdmin, productoController.create);
router.post('/importar', requireAdmin, productoController.importarMasivamente);
router.put('/:id', requireAdmin, productoController.update);
router.delete('/:id', requireAdmin, productoController.delete);

module.exports = router;
