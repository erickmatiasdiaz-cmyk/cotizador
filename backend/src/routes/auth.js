const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const loginRateLimit = require('../middleware/loginRateLimit');
const { requireAdmin } = require('../middleware/roles');

router.post('/login', loginRateLimit, authController.login);
router.post('/logout', authController.logout);
router.post('/registro', authMiddleware, requireAdmin, authController.registrar);
router.get('/perfil', authMiddleware, authController.getPerfil);

module.exports = router;
