const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/registro', authController.registrar);
router.get('/perfil', authController.getPerfil);

module.exports = router;
