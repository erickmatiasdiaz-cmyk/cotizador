const migrate = require('../database/migrate');
const { initDb, saveDb } = require('../config/database');
const { applyPremiumDemoData } = require('./premiumDemoData');

async function seed() {
  console.log('🔄 Ejecutando migraciones primero...');
  await migrate();
  
  console.log('\n📦 Cargando datos de ejemplo...');
  const db = await initDb();

  // CLIENTES
  const clientes = [
    { nombre: 'María García López', empresa: 'Restaurante El Buen Sabor', rfc: 'RBS850101ABC', email: 'maria@elbuensabor.com', telefono: '555-1234', direccion: 'Av. Reforma #456, Col. Centro', tipo: 'juridica' },
    { nombre: 'Carlos Hernández Ruiz', empresa: 'Cafetería La Esquina', rfc: 'CLE920515XYZ', email: 'carlos@laesquina.com', telefono: '555-5678', direccion: 'Calle 5 de Mayo #78', tipo: 'juridica' },
    { nombre: 'Ana Martínez Torres', empresa: null, rfc: 'MATA880320LMN', email: 'ana.martinez@gmail.com', telefono: '555-9012', direccion: 'Calle Hidalgo #123, Col. Juárez', tipo: 'natural' },
    { nombre: 'Pedro Sánchez Vega', empresa: 'Tiendita Don Pedro', rfc: 'TDP780901OPQ', email: 'pedro@donpedro.com', telefono: '555-3456', direccion: 'Blvd. Revolución #901', tipo: 'juridica' },
    { nombre: 'Laura Ramírez Díaz', empresa: 'Panadería La Moderna', rfc: 'PLM650401RST', email: 'laura@lamoderna.com', telefono: '555-7890', direccion: 'Av. Juárez #234, Col. Centro', tipo: 'juridica' },
    { nombre: 'Roberto Flores Morales', empresa: null, rfc: 'FLMR730812UVW', email: 'roberto.f@hotmail.com', telefono: '555-2345', direccion: 'Calle Morelos #567', tipo: 'natural' },
    { nombre: 'Sofía López Castillo', empresa: 'Hotel Playa Azul', rfc: 'HPA680201XYZ', email: 'sofia@playaazul.com', telefono: '555-6789', direccion: 'Av. Costera #890, Zona Hotelera', tipo: 'juridica' },
    { nombre: 'Diego Torres Mendoza', empresa: 'Carnicería El Torito', rfc: 'CET810501ABC', email: 'diego@eltorito.com', telefono: '555-0123', direccion: 'Mercado Municipal, Local 45', tipo: 'juridica' },
    { nombre: 'Valentina Ruiz Herrera', empresa: null, rfc: 'RUHV900101DEF', email: 'vale.ruiz@gmail.com', telefono: '555-4567', direccion: 'Calle Independencia #345', tipo: 'natural' },
    { nombre: 'Fernando Castillo Ortiz', empresa: 'Abarrotes Don Fernando', rfc: 'ADF750601GHI', email: 'fernando@donfernando.com', telefono: '555-8901', direccion: 'Av. Constitución #678', tipo: 'juridica' }
  ];

  for (const c of clientes) {
    await db.run(`INSERT OR IGNORE INTO clientes (nombre, empresa, rfc, email, telefono, direccion, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.nombre, c.empresa, c.rfc, c.email, c.telefono, c.direccion, c.tipo]);
  }
  saveDb();
  console.log(`✅ ${clientes.length} clientes agregados`);

  // PRODUCTOS
  const productos = [
    { nombre: 'Arroz Grano de Oro 1kg', descripcion: 'Arroz blanco de grano largo', categoria_id: 1, precio_unitario: 1420, stock_actual: 150, unidad_medida: 'unidad' },
    { nombre: 'Frijol Negro 1kg', descripcion: 'Frijol negro seleccionado', categoria_id: 1, precio_unitario: 1750, stock_actual: 120, unidad_medida: 'unidad' },
    { nombre: 'Aceite Vegetal 1L', descripcion: 'Aceite vegetal para cocinar', categoria_id: 1, precio_unitario: 2100, stock_actual: 80, unidad_medida: 'unidad' },
    { nombre: 'Azúcar Estándar 1kg', descripcion: 'Azúcar blanca refinada', categoria_id: 1, precio_unitario: 1300, stock_actual: 200, unidad_medida: 'unidad' },
    { nombre: 'Harina de Trigo 1kg', descripcion: 'Harina de trigo todo uso', categoria_id: 1, precio_unitario: 1120, stock_actual: 90, unidad_medida: 'unidad' },
    { nombre: 'Pasta Spaghetti 500g', descripcion: 'Pasta de sémola de trigo', categoria_id: 1, precio_unitario: 900, stock_actual: 110, unidad_medida: 'unidad' },
    { nombre: 'Atún en Aceite 140g', descripcion: 'Atún en aceite vegetal', categoria_id: 1, precio_unitario: 1220, stock_actual: 160, unidad_medida: 'unidad' },
    { nombre: 'Salsa de Tomate 400g', descripcion: 'Salsa de tomate para pasta', categoria_id: 1, precio_unitario: 950, stock_actual: 95, unidad_medida: 'unidad' },
    { nombre: 'Café Molido 250g', descripcion: 'Café molido premium', categoria_id: 1, precio_unitario: 3250, stock_actual: 70, unidad_medida: 'unidad' },
    { nombre: 'Mayonesa 400g', descripcion: 'Mayonesa tipo gourmet', categoria_id: 1, precio_unitario: 1900, stock_actual: 85, unidad_medida: 'unidad' },
    { nombre: 'Leche Entera 1L', descripcion: 'Leche entera pasteurizada', categoria_id: 2, precio_unitario: 1200, stock_actual: 100, unidad_medida: 'unidad' },
    { nombre: 'Yogur Natural 1kg', descripcion: 'Yogur natural sin azúcar', categoria_id: 2, precio_unitario: 2250, stock_actual: 60, unidad_medida: 'unidad' },
    { nombre: 'Queso Oaxaca 500g', descripcion: 'Queso tipo Oaxaca', categoria_id: 2, precio_unitario: 4250, stock_actual: 40, unidad_medida: 'unidad' },
    { nombre: 'Queso Panela 400g', descripcion: 'Queso panela fresco', categoria_id: 2, precio_unitario: 2750, stock_actual: 50, unidad_medida: 'unidad' },
    { nombre: 'Crema Ácida 450ml', descripcion: 'Crema ácida para cocina', categoria_id: 2, precio_unitario: 1600, stock_actual: 75, unidad_medida: 'unidad' },
    { nombre: 'Mantequilla 250g', descripcion: 'Mantequilla sin sal', categoria_id: 2, precio_unitario: 2400, stock_actual: 90, unidad_medida: 'unidad' },
    { nombre: 'Huevo Blanco 30 pzas', descripcion: 'Caja de huevo blanco', categoria_id: 2, precio_unitario: 3600, stock_actual: 45, unidad_medida: 'unidad' },
    { nombre: 'Pechuga de Pollo 1kg', descripcion: 'Pechuga de pollo fresca', categoria_id: 3, precio_unitario: 5500, stock_actual: 35, unidad_medida: 'kg' },
    { nombre: 'Carne Molida de Res 1kg', descripcion: 'Carne molida magra', categoria_id: 3, precio_unitario: 7250, stock_actual: 25, unidad_medida: 'kg' },
    { nombre: 'Jamón de Pavo 400g', descripcion: 'Jamón de pavo bajo en grasa', categoria_id: 3, precio_unitario: 3100, stock_actual: 55, unidad_medida: 'unidad' },
    { nombre: 'Salchicha de Pavo 500g', descripcion: 'Salchicha de pavo', categoria_id: 3, precio_unitario: 2400, stock_actual: 70, unidad_medida: 'unidad' },
    { nombre: 'Bistec de Res 1kg', descripcion: 'Bistec de res para asar', categoria_id: 3, precio_unitario: 9250, stock_actual: 20, unidad_medida: 'kg' },
    { nombre: 'Tomate Bola 1kg', descripcion: 'Tomate rojo maduro', categoria_id: 4, precio_unitario: 1400, stock_actual: 80, unidad_medida: 'kg' },
    { nombre: 'Cebolla Blanca 1kg', descripcion: 'Cebolla blanca fresca', categoria_id: 4, precio_unitario: 900, stock_actual: 100, unidad_medida: 'kg' },
    { nombre: 'Papa Blanca 1kg', descripcion: 'Papa blanca para cocinar', categoria_id: 4, precio_unitario: 1250, stock_actual: 90, unidad_medida: 'kg' },
    { nombre: 'Zanahoria 1kg', descripcion: 'Zanahoria fresca', categoria_id: 4, precio_unitario: 800, stock_actual: 70, unidad_medida: 'kg' },
    { nombre: 'Limón 1kg', descripcion: 'Limón verde fresco', categoria_id: 4, precio_unitario: 1750, stock_actual: 60, unidad_medida: 'kg' },
    { nombre: 'Plátano Tabasco 1kg', descripcion: 'Plátano tabasco maduro', categoria_id: 4, precio_unitario: 1100, stock_actual: 85, unidad_medida: 'kg' },
    { nombre: 'Manzana Roja 1kg', descripcion: 'Manzana roja importada', categoria_id: 4, precio_unitario: 2100, stock_actual: 50, unidad_medida: 'kg' },
    { nombre: 'Coca-Cola 600ml', descripcion: 'Refresco de cola 600ml', categoria_id: 5, precio_unitario: 900, stock_actual: 200, unidad_medida: 'unidad' },
    { nombre: 'Agua Natural 1L', descripcion: 'Agua purificada 1 litro', categoria_id: 5, precio_unitario: 600, stock_actual: 180, unidad_medida: 'unidad' },
    { nombre: 'Jugo de Naranja 1L', descripcion: 'Jugo de naranja 100%', categoria_id: 5, precio_unitario: 1750, stock_actual: 75, unidad_medida: 'unidad' },
    { nombre: 'Cerveza Clara 355ml', descripcion: 'Cerveza clara de lata', categoria_id: 5, precio_unitario: 1400, stock_actual: 150, unidad_medida: 'unidad' },
    { nombre: 'Agua Mineral 600ml', descripcion: 'Agua mineral con gas', categoria_id: 5, precio_unitario: 750, stock_actual: 120, unidad_medida: 'unidad' },
    { nombre: 'Detergente Líquido 1L', descripcion: 'Detergente líquido concentrado', categoria_id: 6, precio_unitario: 2750, stock_actual: 60, unidad_medida: 'unidad' },
    { nombre: 'Cloro 1L', descripcion: 'Cloro desinfectante', categoria_id: 6, precio_unitario: 1100, stock_actual: 90, unidad_medida: 'unidad' },
    { nombre: 'Jabón para Trastes 750ml', descripcion: 'Jabón líquido para trastes', categoria_id: 6, precio_unitario: 1750, stock_actual: 80, unidad_medida: 'unidad' },
    { nombre: 'Servilletas 100 pzas', descripcion: 'Paquete de servilletas blancas', categoria_id: 6, precio_unitario: 900, stock_actual: 110, unidad_medida: 'unidad' },
    { nombre: 'Papel Higiénico 4 rollos', descripcion: 'Papel higiénico doble hoja', categoria_id: 6, precio_unitario: 2100, stock_actual: 100, unidad_medida: 'unidad' },
    { nombre: 'Pasta Dental 100g', descripcion: 'Pasta dental con flúor', categoria_id: 7, precio_unitario: 1400, stock_actual: 90, unidad_medida: 'unidad' },
    { nombre: 'Jabón de Baño 125g', descripcion: 'Jabón de baño antibacterial', categoria_id: 7, precio_unitario: 750, stock_actual: 120, unidad_medida: 'unidad' },
    { nombre: 'Shampoo 400ml', descripcion: 'Shampoo hidratante', categoria_id: 7, precio_unitario: 2750, stock_actual: 65, unidad_medida: 'unidad' },
    { nombre: 'Desodorante 75g', descripcion: 'Desodorante en barra', categoria_id: 7, precio_unitario: 1900, stock_actual: 80, unidad_medida: 'unidad' },
    { nombre: 'Pan Bimbo Grande', descripcion: 'Pan blanco de caja grande', categoria_id: 8, precio_unitario: 3400, stock_actual: 40, unidad_medida: 'unidad' },
    { nombre: 'Tortillas de Maíz 1kg', descripcion: 'Tortillas de maíz recién hechas', categoria_id: 8, precio_unitario: 1000, stock_actual: 100, unidad_medida: 'unidad' },
    { nombre: 'Pan Integral', descripcion: 'Pan integral de caja', categoria_id: 8, precio_unitario: 2600, stock_actual: 35, unidad_medida: 'unidad' },
    { nombre: 'Bolillo Pieza', descripcion: 'Bolillo fresco del día', categoria_id: 8, precio_unitario: 220, stock_actual: 200, unidad_medida: 'unidad' },
    { nombre: 'Champiñones en Lata 220g', descripcion: 'Champiñones rebanados', categoria_id: 10, precio_unitario: 1100, stock_actual: 85, unidad_medida: 'unidad' },
    { nombre: 'Elote en Grano 300g', descripcion: 'Elote dulce en grano', categoria_id: 10, precio_unitario: 900, stock_actual: 95, unidad_medida: 'unidad' },
    { nombre: 'Duraznos en Almíbar 400g', descripcion: 'Duraznos en mitades', categoria_id: 10, precio_unitario: 1600, stock_actual: 70, unidad_medida: 'unidad' },
    { nombre: 'Chiles Jalapeños 220g', descripcion: 'Chiles jalapeños en escabeche', categoria_id: 10, precio_unitario: 1000, stock_actual: 110, unidad_medida: 'unidad' }
  ];

  for (const p of productos) {
    await db.run(`INSERT OR IGNORE INTO productos (nombre, descripcion, categoria_id, precio_unitario, stock_actual, unidad_medida) VALUES (?, ?, ?, ?, ?, ?)`,
      [p.nombre, p.descripcion, p.categoria_id, p.precio_unitario, p.stock_actual, p.unidad_medida]);
  }
  saveDb();
  console.log(`✅ ${productos.length} productos agregados`);

  await applyPremiumDemoData();
  console.log('Usuarios demo e imagenes premium actualizados');

  console.log('\n🎉 Datos de ejemplo cargados exitosamente');
  console.log('📊 Total: 10 clientes, 51 productos en 10 categorías');
}

seed().catch(console.error);
