const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const { generarPDFCotizacion } = require('../utils/pdfGenerator');
const { enviarCotizacionEmail } = require('../utils/emailService');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', cotizacionController.getAll);
router.get('/estadisticas', cotizacionController.getEstadisticas);
router.get('/:id', cotizacionController.getById);
router.put('/:id/estado', cotizacionController.updateEstado);
router.post('/:id/convertir-venta', cotizacionController.convertirVenta);
router.post('/:id/enviar-email', cotizacionController.enviarEmail);
router.delete('/:id', cotizacionController.delete);

// Generar PDF
router.get('/:id/pdf', (req, res) => {
  try {
    generarPDFCotizacion(req.params.id, res);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

// Generar PDF Factura
router.get('/:id/factura/pdf', cotizacionController.descargarFactura);

// Enviar por email
router.post('/:id/enviar-email', async (req, res) => {
  try {
    const resultado = await enviarCotizacionEmail(req.params.id);
    res.json(resultado);
  } catch (error) {
    console.error('Error al enviar email:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
