require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const migrate = require('./database/migrate');
const { initDb } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rutas
const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const productosRoutes = require('./routes/productos');
const cotizacionesRoutes = require('./routes/cotizaciones');
const configuracionRoutes = require('./routes/configuracion');
const publicRoutes = require('./routes/public');
const categoriasRoutes = require('./routes/categorias');

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/categorias', categoriasRoutes);

// Alias para despliegues que enrutan el servicio backend directamente bajo /api.
app.use('/auth', authRoutes);
app.use('/clientes', clientesRoutes);
app.use('/productos', productosRoutes);
app.use('/cotizaciones', cotizacionesRoutes);
app.use('/configuracion', configuracionRoutes);
app.use('/public', publicRoutes);
app.use('/categorias', categoriasRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
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

// Servir el frontend compilado cuando exista. Esto facilita subir todo como una app.
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

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

if (require.main === module) {
  start().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;
