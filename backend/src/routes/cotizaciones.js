const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const { generarPDFCotizacion } = require('../utils/pdfGenerator');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', cotizacionController.getAll);
router.get('/estadisticas', cotizacionController.getEstadisticas);
router.get('/:id', cotizacionController.getById);
router.post('/', cotizacionController.create);
router.put('/:id/estado', cotizacionController.updateEstado);
router.post('/:id/convertir-venta', cotizacionController.convertirVenta);
router.post('/:id/enviar-email', cotizacionController.enviarEmail);
router.delete('/:id', cotizacionController.delete);

// Generar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    await generarPDFCotizacion(req.params.id, res);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
});

// Generar PDF Factura
router.get('/:id/factura/pdf', cotizacionController.descargarFactura);

module.exports = router;
