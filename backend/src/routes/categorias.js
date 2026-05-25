const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', categoriaController.getAll);
router.get('/:id', categoriaController.getById);
router.post('/', requireAdmin, categoriaController.create);
router.put('/:id', requireAdmin, categoriaController.update);
router.delete('/:id', requireAdmin, categoriaController.delete);

module.exports = router;
