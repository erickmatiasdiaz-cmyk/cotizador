require('dotenv').config();
const express = require('express');
const cors = require('cors');
const migrate = require('./database/migrate');
const { initDb } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rutas
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const productosRoutes = require('./routes/productos');
const cotizacionesRoutes = require('./routes/cotizaciones');
const configuracionRoutes = require('./routes/configuracion');
const publicRoutes = require('./routes/public');

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta por defecto
app.get('/', (req, res) => {
  res.json({
    message: 'API Cotizador Supermercado',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      clientes: '/api/clientes',
      productos: '/api/productos',
      cotizaciones: '/api/cotizaciones'
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Iniciar servidor
async function start() {
  console.log(`\n🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
  
  try {
    await initDb();
    await migrate();
    console.log(`✅ Base de datos lista\n`);
  } catch (error) {
    console.error('❌ Error en migraciones:', error);
  }
  
  app.listen(PORT);
}

start();

module.exports = app;
