const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', configuracionController.getAll);
router.put('/', requireAdmin, configuracionController.update);

module.exports = router;
