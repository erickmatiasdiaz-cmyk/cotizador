const { initDb, saveDb } = require('../config/database');
const { audit } = require('../utils/auditLogger');

class ProductoController {
  async getAll(req, res) {
    try {
      const { search, categoria_id } = req.query;
      const db = await initDb();
      
      let query = `
        SELECT p.id, p.nombre, p.descripcion, p.categoria_id, c.nombre as categoria,
               p.precio_unitario, p.stock_actual, p.unidad_medida, p.imagen_url
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE 1=1
      `;

      if (search) {
        query += ` AND (p.nombre LIKE '%${search}%' OR p.descripcion LIKE '%${search}%')`;
      }
      if (categoria_id) {
        query += ` AND p.categoria_id = ${categoria_id}`;
      }
      query += ` ORDER BY p.nombre ASC`;

      const result = await db.exec(query);
      const productos = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], nombre: row[1], descripcion: row[2], categoria_id: row[3],
        categoria: row[4], precio_unitario: row[5], stock_actual: row[6],
        unidad_medida: row[7], imagen_url: row[8]
      })) : [];

      res.json(productos);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getById(req, res) {
    try {
      const db = await initDb();
      const query = `
        SELECT p.id, p.nombre, p.descripcion, p.categoria_id, c.nombre as categoria,
               p.precio_unitario, p.stock_actual, p.unidad_medida, p.imagen_url
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = ${req.params.id}
      `;
      const result = await db.exec(query);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const row = result[0].values[0];
      res.json({
        id: row[0], nombre: row[1], descripcion: row[2], categoria_id: row[3],
        categoria: row[4], precio_unitario: row[5], stock_actual: row[6],
        unidad_medida: row[7], imagen_url: row[8]
      });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async create(req, res) {
    try {
      const { nombre, descripcion, categoria_id, precio_unitario, stock_actual, unidad_medida, imagen_url } = req.body;
      if (!nombre || precio_unitario === undefined) {
        return res.status(400).json({ error: 'Nombre y precio unitario son requeridos' });
      }

      const db = await initDb();
      await db.run(`INSERT INTO productos (nombre, descripcion, categoria_id, precio_unitario, stock_actual, unidad_medida, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombre, descripcion || null, categoria_id || null, precio_unitario, stock_actual || 0, unidad_medida || 'unidad', imagen_url || null]);
      saveDb();

      const result = await db.exec(`SELECT last_insert_rowid()`);
      const id = result[0].values[0][0];
      await audit(req, {
        accion: 'crear',
        entidad: 'producto',
        entidad_id: id,
        detalle: { nombre, precio_unitario, stock_actual: stock_actual || 0 }
      });

      res.status(201).json({
        id, nombre, descripcion, categoria_id,
        precio_unitario, stock_actual: stock_actual || 0, unidad_medida: unidad_medida || 'unidad', imagen_url
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async update(req, res) {
    try {
      const { nombre, descripcion, categoria_id, precio_unitario, stock_actual, unidad_medida, imagen_url } = req.body;
      const db = await initDb();
      
      await db.run(`UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, precio_unitario = ?, stock_actual = ?, unidad_medida = ?, imagen_url = ? WHERE id = ?`,
        [nombre, descripcion || null, categoria_id || null, precio_unitario, stock_actual || 0, unidad_medida || 'unidad', imagen_url || null, req.params.id]);
      saveDb();
      await audit(req, {
        accion: 'actualizar',
        entidad: 'producto',
        entidad_id: Number(req.params.id),
        detalle: { nombre, precio_unitario, stock_actual }
      });

      res.json({
        id: parseInt(req.params.id), nombre, descripcion, categoria_id,
        precio_unitario, stock_actual, unidad_medida, imagen_url
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req, res) {
    try {
      const db = await initDb();
      await db.run(`DELETE FROM productos WHERE id = ?`, [req.params.id]);
      saveDb();
      await audit(req, {
        accion: 'eliminar',
        entidad: 'producto',
        entidad_id: Number(req.params.id)
      });
      res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getCategorias(req, res) {
    try {
      const db = await initDb();
      const query = `
        SELECT c.id, c.nombre, c.descripcion, COUNT(p.id) as total_productos
        FROM categorias c
        LEFT JOIN productos p ON c.id = p.categoria_id
        GROUP BY c.id
        ORDER BY c.nombre ASC
      `;
      const result = await db.exec(query);
      const categorias = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], nombre: row[1], descripcion: row[2], total_productos: row[3]
      })) : [];

      res.json(categorias);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async importarMasivamente(req, res) {
    try {
      const productos = req.body;
      if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Formato inválido. Se espera un arreglo de productos.' });
      }

      const db = await initDb();
      let agregados = 0;
      let actualizados = 0;

      for (const prod of productos) {
        const nombre = prod.Nombre || prod.nombre;
        const descripcion = prod.Descripcion || prod.descripcion || '';
        const precio_unitario = parseFloat(prod.Precio || prod.precio || prod.precio_unitario) || 0;
        const stock_actual = parseFloat(prod.Stock || prod.stock || prod.stock_actual) || 0;

        if (!nombre || !precio_unitario) continue;

        // Comprobar si existe
        const existsResult = await db.exec(`SELECT id, stock_actual FROM productos WHERE nombre = '${nombre.replace(/'/g, "''")}'`);
        
        if (existsResult.length > 0 && existsResult[0].values.length > 0) {
          // Existe: actualizar
          const existingId = existsResult[0].values[0][0];
          await db.run(`UPDATE productos SET precio_unitario = ?, stock_actual = stock_actual + ?, descripcion = ? WHERE id = ?`,
            [precio_unitario, stock_actual, descripcion, existingId]);
          actualizados++;
        } else {
          // No existe: crear
          await db.run(`INSERT INTO productos (nombre, descripcion, precio_unitario, stock_actual, unidad_medida) VALUES (?, ?, ?, ?, ?)`,
            [nombre, descripcion, precio_unitario, stock_actual, 'unidad']);
          agregados++;
        }
      }

      saveDb();
      await audit(req, {
        accion: 'importar',
        entidad: 'producto',
        detalle: { agregados, actualizados }
      });
      res.json({ message: 'Importación finalizada', agregados, actualizados });
    } catch (error) {
      console.error('Error al importar productos:', error);
      res.status(500).json({ error: 'Error interno del servidor al importar masivamente' });
    }
  }
}

module.exports = new ProductoController();
