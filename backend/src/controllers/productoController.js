const { initDb, saveDb } = require('../config/database');
const { audit } = require('../utils/auditLogger');

const METRICAS_CACHE_MS = 30000;
let metricasCache = null;
let metricasInFlight = null;

function invalidateMetricasCache() {
  metricasCache = null;
}

async function registrarMovimientoStock(db, req, productoId, tipo, cantidad, stockAnterior, stockNuevo, motivo) {
  try {
    await db.run(
      `INSERT INTO stock_movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productoId, req.usuario?.id || null, tipo, cantidad, stockAnterior, stockNuevo, motivo]
    );
  } catch (error) {
    if (!String(error.message || '').includes('stock_movimientos')) {
      console.error('Error al registrar movimiento de stock:', error.message);
    }
  }
}

class ProductoController {
  async getAll(req, res) {
    try {
      const { search, categoria_id } = req.query;
      const db = await initDb();
      const params = [];

      let query = `
        SELECT p.id, p.nombre, p.descripcion, p.categoria_id, c.nombre as categoria,
               p.precio_unitario, p.stock_actual, p.unidad_medida, p.imagen_url,
               (p.precio_unitario * p.stock_actual) as valor_inventario
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE 1=1
      `;

      if (search) {
        const like = `%${search}%`;
        query += ` AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`;
        params.push(like, like);
      }
      if (categoria_id) {
        const catId = Number(categoria_id);
        if (Number.isInteger(catId)) {
          query += ` AND p.categoria_id = ?`;
          params.push(catId);
        }
      }
      query += ` ORDER BY p.nombre ASC`;

      const result = await db.query(query, params);
      const productos = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], nombre: row[1], descripcion: row[2], categoria_id: row[3],
        categoria: row[4], precio_unitario: row[5], stock_actual: row[6],
        unidad_medida: row[7], imagen_url: row[8], valor_inventario: row[9],
        stock_status: Number(row[6]) <= 0 ? 'sin_stock' : Number(row[6]) < 10 ? 'critico' : Number(row[6]) < 25 ? 'bajo' : 'saludable'
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
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de producto invalido' });
      }
      const query = `
        SELECT p.id, p.nombre, p.descripcion, p.categoria_id, c.nombre as categoria,
               p.precio_unitario, p.stock_actual, p.unidad_medida, p.imagen_url
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.id = ?
      `;
      const result = await db.query(query, [id]);
      
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
      invalidateMetricasCache();

      const result = await db.exec(`SELECT last_insert_rowid()`);
      const id = result[0].values[0][0];
      await registrarMovimientoStock(db, req, id, 'entrada_inicial', stock_actual || 0, 0, stock_actual || 0, 'Creacion de producto');
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
      const previousResult = await db.query(`SELECT stock_actual FROM productos WHERE id = ?`, [Number(req.params.id)]);
      const previousStock = previousResult.length > 0 && previousResult[0].values.length > 0
        ? Number(previousResult[0].values[0][0])
        : 0;
      const nextStock = Number(stock_actual || 0);
      
      await db.run(`UPDATE productos SET nombre = ?, descripcion = ?, categoria_id = ?, precio_unitario = ?, stock_actual = ?, unidad_medida = ?, imagen_url = ? WHERE id = ?`,
        [nombre, descripcion || null, categoria_id || null, precio_unitario, nextStock, unidad_medida || 'unidad', imagen_url || null, req.params.id]);
      if (nextStock !== previousStock) {
        await registrarMovimientoStock(
          db,
          req,
          Number(req.params.id),
          nextStock > previousStock ? 'ajuste_entrada' : 'ajuste_salida',
          Math.abs(nextStock - previousStock),
          previousStock,
          nextStock,
          'Ajuste manual desde ficha de producto'
        );
      }
      saveDb();
      invalidateMetricasCache();
      await audit(req, {
        accion: 'actualizar',
        entidad: 'producto',
        entidad_id: Number(req.params.id),
        detalle: { nombre, precio_unitario, stock_actual: nextStock }
      });

      res.json({
        id: parseInt(req.params.id), nombre, descripcion, categoria_id,
        precio_unitario, stock_actual: nextStock, unidad_medida, imagen_url
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
      invalidateMetricasCache();
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
        const existsResult = await db.query(`SELECT id, stock_actual FROM productos WHERE nombre = ?`, [nombre]);
        
        if (existsResult.length > 0 && existsResult[0].values.length > 0) {
          // Existe: actualizar
          const existingId = existsResult[0].values[0][0];
          const previousStock = Number(existsResult[0].values[0][1]);
          await db.run(`UPDATE productos SET precio_unitario = ?, stock_actual = stock_actual + ?, descripcion = ? WHERE id = ?`,
            [precio_unitario, stock_actual, descripcion, existingId]);
          await registrarMovimientoStock(db, req, existingId, 'importacion_entrada', stock_actual, previousStock, previousStock + stock_actual, 'Importacion masiva');
          actualizados++;
        } else {
          // No existe: crear
          await db.run(`INSERT INTO productos (nombre, descripcion, precio_unitario, stock_actual, unidad_medida) VALUES (?, ?, ?, ?, ?)`,
            [nombre, descripcion, precio_unitario, stock_actual, 'unidad']);
          const insertedResult = await db.exec(`SELECT last_insert_rowid()`);
          const insertedId = insertedResult[0].values[0][0];
          await registrarMovimientoStock(db, req, insertedId, 'importacion_inicial', stock_actual, 0, stock_actual, 'Importacion masiva');
          agregados++;
        }
      }

      saveDb();
      invalidateMetricasCache();
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

  async buildMetricas() {
    try {
      const db = await initDb();
      const totalResult = await db.exec(`
        SELECT 
          COUNT(*) as total_productos,
          COALESCE(SUM(stock_actual), 0) as unidades_stock,
          COALESCE(SUM(precio_unitario * stock_actual), 0) as valor_inventario,
          COALESCE(AVG(precio_unitario), 0) as precio_promedio,
          SUM(CASE WHEN stock_actual <= 0 THEN 1 ELSE 0 END) as sin_stock,
          SUM(CASE WHEN stock_actual > 0 AND stock_actual < 10 THEN 1 ELSE 0 END) as criticos,
          SUM(CASE WHEN stock_actual >= 10 AND stock_actual < 25 THEN 1 ELSE 0 END) as bajos
        FROM productos
      `);

      const categoriasResult = await db.exec(`
        SELECT c.nombre, COUNT(p.id) as productos, COALESCE(SUM(p.stock_actual), 0) as unidades,
               COALESCE(SUM(p.precio_unitario * p.stock_actual), 0) as valor
        FROM categorias c
        LEFT JOIN productos p ON p.categoria_id = c.id
        GROUP BY c.id, c.nombre
        ORDER BY valor DESC
      `);

      const movimientosResult = await db.exec(`
        SELECT sm.id, p.nombre, sm.tipo, sm.cantidad, sm.stock_anterior, sm.stock_nuevo, sm.motivo, sm.creado_en
        FROM stock_movimientos sm
        LEFT JOIN productos p ON p.id = sm.producto_id
        ORDER BY sm.creado_en DESC
        LIMIT 8
      `);

      const row = totalResult[0]?.values[0] || [0, 0, 0, 0, 0, 0, 0];
      return {
        total_productos: row[0],
        unidades_stock: row[1],
        valor_inventario: row[2],
        precio_promedio: row[3],
        sin_stock: row[4],
        criticos: row[5],
        bajos: row[6],
        categorias: categoriasResult.length > 0 ? categoriasResult[0].values.map(item => ({
          nombre: item[0],
          productos: item[1],
          unidades: item[2],
          valor: item[3]
        })) : [],
        movimientos: movimientosResult.length > 0 ? movimientosResult[0].values.map(item => ({
          id: item[0],
          producto: item[1],
          tipo: item[2],
          cantidad: item[3],
          stock_anterior: item[4],
          stock_nuevo: item[5],
          motivo: item[6],
          creado_en: item[7]
        })) : []
      };
    } catch (error) {
      console.error('Error al obtener metricas de productos:', error);
      throw error;
    }
  }

  async getMetricas(req, res) {
    try {
      const now = Date.now();

      if (metricasCache && metricasCache.expiresAt > now) {
        return res.json(metricasCache.data);
      }

      if (!metricasInFlight) {
        metricasInFlight = ProductoController.prototype.buildMetricas()
          .then(data => {
            metricasCache = {
              data,
              expiresAt: Date.now() + METRICAS_CACHE_MS
            };
            return data;
          })
          .finally(() => {
            metricasInFlight = null;
          });
      }

      const data = await metricasInFlight;
      res.json(data);
    } catch (error) {
      console.error('Error al obtener metricas de productos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new ProductoController();
