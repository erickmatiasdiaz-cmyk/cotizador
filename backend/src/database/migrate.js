const { initDb, saveDb } = require('../config/database');
const bcrypt = require('bcryptjs');

async function migrate() {
  console.log('Ejecutando migraciones...');
  const db = await initDb();

  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'vendedor',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  saveDb();

  // Tabla de clientes
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      empresa TEXT,
      rfc TEXT,
      email TEXT,
      telefono TEXT,
      direccion TEXT,
      tipo TEXT DEFAULT 'natural',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  saveDb();

  // Tabla de categorías
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT
    )
  `);
  saveDb();

  // Tabla de productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER,
      precio_unitario REAL NOT NULL,
      stock_actual INTEGER DEFAULT 0,
      unidad_medida TEXT DEFAULT 'unidad',
      imagen_url TEXT,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )
  `);
  saveDb();

  // Tabla de cotizaciones
  db.run(`
    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT UNIQUE NOT NULL,
      cliente_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      iva REAL NOT NULL DEFAULT 0,
      descuento_porcentaje REAL DEFAULT 0,
      descuento_monto REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notas TEXT,
      validez_dias INTEGER DEFAULT 15,
      fecha_validez DATE,
      estado TEXT DEFAULT 'pendiente',
      enviado_email INTEGER DEFAULT 0,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      factura_numero TEXT,
      factura_fecha DATETIME,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
  saveDb();

  // Tabla de items de cotización
  db.run(`
    CREATE TABLE IF NOT EXISTS cotizacion_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);
  saveDb();

  // Tabla de configuración
  db.run(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL
    )
  `);
  saveDb();

  // Insertar configuración por defecto
  const configDefaults = [
    ['SUPERMERCADO_NOMBRE', 'Mi Supermercado'],
    ['SUPERMERCADO_DIRECCION', 'Calle Principal #123'],
    ['SUPERMERCADO_TELEFONO', '+1 234 567 8900'],
    ['SUPERMERCADO_EMAIL', 'contacto@supermercado.com'],
    ['IVA_PORCENTAJE', '16'],
    ['MONEDA', 'MXN']
  ];

  configDefaults.forEach(([clave, valor]) => {
    db.run(`INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)`, [clave, valor]);
  });
  saveDb();

  // Insertar usuario admin por defecto
  const existingUser = db.exec(`SELECT id FROM usuarios WHERE email = 'admin@supermercado.com'`);
  if (existingUser.length === 0 || existingUser[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)`,
      ['Administrador', 'admin@supermercado.com', hashedPassword, 'admin']);
    saveDb();
    console.log('👤 Usuario admin creado');
  }

  // Insertar categorías de ejemplo
  const categoriasEjemplo = [
    ['Abarrotes', 'Productos de abarrotes en general'],
    ['Lácteos', 'Leche, quesos, yogures'],
    ['Carnes', 'Carnes frías y frescas'],
    ['Frutas y Verduras', 'Productos frescos'],
    ['Bebidas', 'Refrescos, jugos, agua'],
    ['Limpieza', 'Productos de limpieza'],
    ['Higiene', 'Productos de higiene personal'],
    ['Panadería', 'Pan y productos de panadería'],
    ['Lácteos y Huevos', 'Productos lácteos y huevos'],
    ['Enlatados', 'Productos enlatados y conservas']
  ];

  categoriasEjemplo.forEach(([nombre, descripcion]) => {
    db.run(`INSERT OR IGNORE INTO categorias (nombre, descripcion) VALUES (?, ?)`, [nombre, descripcion]);
  });
  saveDb();
  console.log('📂 Categorías creadas');

  console.log('✅ Migraciones completadas exitosamente');
}

if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = migrate;
