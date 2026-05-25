const bcrypt = require('bcryptjs');
const { initDb, saveDb } = require('../config/database');

const demoUsers = [
  {
    nombre: 'Administrador General',
    email: 'admin@supermercado.com',
    password: 'admin123',
    rol: 'admin'
  },
  {
    nombre: 'Gerente de Tienda',
    email: 'gerente@supermercado.com',
    password: 'gerente123',
    rol: 'admin'
  },
  {
    nombre: 'Vendedor Mostrador',
    email: 'vendedor@supermercado.com',
    password: 'vendedor123',
    rol: 'vendedor'
  },
  {
    nombre: 'Ejecutiva Comercial',
    email: 'ventas@supermercado.com',
    password: 'ventas123',
    rol: 'vendedor'
  }
];

const productImages = [
  ['Arroz Grano de Oro 1kg', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=85'],
  ['Frijol Negro 1kg', 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=85'],
  ['Aceite Vegetal 1L', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85'],
  ['Azúcar Estándar 1kg', 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=900&q=85'],
  ['Harina de Trigo 1kg', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=85'],
  ['Pasta Spaghetti 500g', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=900&q=85'],
  ['Atún en Aceite 140g', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=85'],
  ['Salsa de Tomate 400g', 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=900&q=85'],
  ['Café Molido 250g', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85'],
  ['Mayonesa 400g', 'https://images.unsplash.com/photo-1604908554027-cc176cd6bbbc?auto=format&fit=crop&w=900&q=85'],
  ['Leche Entera 1L', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=85'],
  ['Yogur Natural 1kg', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85'],
  ['Queso Oaxaca 500g', 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=900&q=85'],
  ['Queso Panela 400g', 'https://images.unsplash.com/photo-1552767059-ce182ead6c1b?auto=format&fit=crop&w=900&q=85'],
  ['Crema Ácida 450ml', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=900&q=85'],
  ['Mantequilla 250g', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=85'],
  ['Huevo Blanco 30 pzas', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=85'],
  ['Pechuga de Pollo 1kg', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=85'],
  ['Carne Molida de Res 1kg', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=85'],
  ['Jamón de Pavo 400g', 'https://images.unsplash.com/photo-1524438418049-ab2acb7aa48f?auto=format&fit=crop&w=900&q=85'],
  ['Salchicha de Pavo 500g', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=85'],
  ['Bistec de Res 1kg', 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=85'],
  ['Tomate Bola 1kg', 'https://images.unsplash.com/photo-1546470427-e5ac89e8bd8d?auto=format&fit=crop&w=900&q=85'],
  ['Cebolla Blanca 1kg', 'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?auto=format&fit=crop&w=900&q=85'],
  ['Papa Blanca 1kg', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85'],
  ['Zanahoria 1kg', 'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=900&q=85'],
  ['Limón 1kg', 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=900&q=85'],
  ['Plátano Tabasco 1kg', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=85'],
  ['Manzana Roja 1kg', 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=85'],
  ['Coca-Cola 600ml', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=85'],
  ['Agua Natural 1L', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85'],
  ['Jugo de Naranja 1L', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=85'],
  ['Cerveza Clara 355ml', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=85'],
  ['Agua Mineral 600ml', 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=85'],
  ['Detergente Líquido 1L', 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=900&q=85'],
  ['Cloro 1L', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=85'],
  ['Jabón para Trastes 750ml', 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=900&q=85'],
  ['Servilletas 100 pzas', 'https://images.unsplash.com/photo-1600369672770-985fd30004eb?auto=format&fit=crop&w=900&q=85'],
  ['Papel Higiénico 4 rollos', 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=900&q=85'],
  ['Pasta Dental 100g', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=900&q=85'],
  ['Jabón de Baño 125g', 'https://images.unsplash.com/photo-1607006483224-8cbde65f4c2f?auto=format&fit=crop&w=900&q=85'],
  ['Shampoo 400ml', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85'],
  ['Desodorante 75g', 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=900&q=85'],
  ['Pan Bimbo Grande', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85'],
  ['Tortillas de Maíz 1kg', 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=85'],
  ['Pan Integral', 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=85'],
  ['Bolillo Pieza', 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=900&q=85'],
  ['Champiñones en Lata 220g', 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=85'],
  ['Elote en Grano 300g', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=900&q=85'],
  ['Duraznos en Almíbar 400g', 'https://images.unsplash.com/photo-1531171596281-8b5d26917d8b?auto=format&fit=crop&w=900&q=85'],
  ['Chiles Jalapeños 220g', 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?auto=format&fit=crop&w=900&q=85']
];

async function applyPremiumDemoData() {
  const db = await initDb();

  for (const user of demoUsers) {
    const exists = await db.exec(`SELECT id FROM usuarios WHERE email = '${user.email.replace(/'/g, "''")}'`);
    const hashedPassword = bcrypt.hashSync(user.password, 10);

    if (exists.length > 0 && exists[0].values.length > 0) {
      await db.run(
        'UPDATE usuarios SET nombre = ?, password = ?, rol = ? WHERE email = ?',
        [user.nombre, hashedPassword, user.rol, user.email]
      );
    } else {
      await db.run(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [user.nombre, user.email, hashedPassword, user.rol]
      );
    }
  }

  for (const [nombre, imagenUrl] of productImages) {
    await db.run('UPDATE productos SET imagen_url = ? WHERE nombre = ?', [imagenUrl, nombre]);
  }

  saveDb();

  return {
    usuarios: demoUsers.map(({ nombre, email, password, rol }) => ({ nombre, email, password, rol })),
    imagenes: productImages.length
  };
}

if (require.main === module) {
  applyPremiumDemoData()
    .then(result => {
      console.log(`Usuarios demo listos: ${result.usuarios.length}`);
      console.log(`Imagenes de producto actualizadas: ${result.imagenes}`);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { applyPremiumDemoData, demoUsers, productImages };
