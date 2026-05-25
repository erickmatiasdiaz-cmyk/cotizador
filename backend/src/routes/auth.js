const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.post('/login', authController.login);
router.post('/registro', authMiddleware, requireAdmin, authController.registrar);
router.get('/perfil', authMiddleware, authController.getPerfil);

module.exports = router;
