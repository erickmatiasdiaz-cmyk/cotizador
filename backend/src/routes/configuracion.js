const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', configuracionController.getAll);
router.put('/', configuracionController.update);

module.exports = router;
