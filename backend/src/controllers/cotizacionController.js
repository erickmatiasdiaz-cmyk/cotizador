const { initDb, saveDb } = require('../config/database');
const { audit } = require('../utils/auditLogger');

const STOCK_FLAG_TRUE = (db) => (db.isPostgres ? true : 1);
const ESTADISTICAS_CACHE_MS = 30000;

const isStockDiscounted = (value) => value === true || value === 1 || value === '1' || value === 't';

let estadisticasCache = null;
let estadisticasInFlight = null;

function invalidateEstadisticasCache() {
  estadisticasCache = null;
}

function firstRow(result) {
  return result.length > 0 && result[0].values.length > 0 ? result[0].values[0] : null;
}

function rows(result) {
  return result.length > 0 ? result[0].values : [];
}

async function generateBusinessNumber(db, prefix) {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');

  if (db.isPostgres) {
    const seqRow = firstRow(await db.query(`SELECT nextval('cotizaciones_numero_seq')`));
    return `${prefix}-${year}${month}-${String(seqRow[0]).padStart(6, '0')}`;
  }

  const countRow = firstRow(await db.query(`SELECT COALESCE(MAX(id), 0) + 1 FROM cotizaciones`)) || [1];
  return `${prefix}-${year}${month}-${String(countRow[0]).padStart(6, '0')}`;
}

async function getCotizacionItemsForStock(db, cotizacionId) {
  const itemsResult = await db.query(`
    SELECT ci.producto_id, SUM(ci.cantidad) as cantidad, p.nombre, p.stock_actual
    FROM cotizacion_items ci
    JOIN productos p ON p.id = ci.producto_id
    WHERE ci.cotizacion_id = ?
    GROUP BY ci.producto_id, p.nombre, p.stock_actual
  `, [cotizacionId]);

  return rows(itemsResult);
}

async function descontarStockCotizacion(db, req, cotizacionId) {
  const items = await getCotizacionItemsForStock(db, cotizacionId);

  if (items.length === 0) {
    throw new Error('La cotizacion no tiene productos para descontar stock');
  }

  for (const item of items) {
    const cantidad = Number(item[1]);
    const stockActual = Number(item[3]);

    if (cantidad > stockActual) {
      throw new Error(`Stock insuficiente para ${item[2]}. Disponible: ${stockActual}, requerido: ${cantidad}`);
    }
  }

  for (const item of items) {
    const productoId = item[0];
    const cantidad = Number(item[1]);
    let stockAnterior = Number(item[3]);
    const stockNuevo = stockAnterior - cantidad;

    if (db.isPostgres) {
      const updateResult = await db.query(
        `UPDATE productos
         SET stock_actual = stock_actual - ?
         WHERE id = ? AND stock_actual >= ?
         RETURNING stock_actual + ? as stock_anterior, stock_actual as stock_nuevo`,
        [cantidad, productoId, cantidad, cantidad]
      );
      const updateRow = firstRow(updateResult);
      if (!updateRow) {
        throw new Error(`Stock insuficiente para ${item[2]}`);
      }
      stockAnterior = Number(updateRow[0]);
    } else {
      await db.run(`UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?`, [cantidad, productoId]);
    }

    await db.run(
      `INSERT INTO stock_movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productoId, req.usuario.id, 'cotizacion_aceptada_salida', cantidad, stockAnterior, stockAnterior - cantidad, `Stock descontado al aceptar cotizacion ${cotizacionId}`]
    );
  }
}

async function reponerStockCotizacion(db, req, cotizacionId) {
  const items = await getCotizacionItemsForStock(db, cotizacionId);

  for (const item of items) {
    const productoId = item[0];
    const cantidad = Number(item[1]);
    let stockAnterior = Number(item[3]);

    if (db.isPostgres) {
      const updateResult = await db.query(
        `UPDATE productos
         SET stock_actual = stock_actual + ?
         WHERE id = ?
         RETURNING stock_actual - ? as stock_anterior, stock_actual as stock_nuevo`,
        [cantidad, productoId, cantidad]
      );
      const updateRow = firstRow(updateResult);
      if (updateRow) stockAnterior = Number(updateRow[0]);
    } else {
      await db.run(`UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?`, [cantidad, productoId]);
    }

    await db.run(
      `INSERT INTO stock_movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productoId, req.usuario.id, 'cotizacion_revertida_entrada', cantidad, stockAnterior, stockAnterior + cantidad, `Stock repuesto al revertir cotizacion ${cotizacionId}`]
    );
  }
}

class CotizacionController {
  async getAll(req, res) {
    try {
      const { search, estado, cliente_id, fecha_desde, fecha_hasta } = req.query;
      const db = await initDb();
      const params = [];
      
      let query = `
        SELECT 
          c.id, c.numero, c.cliente_id, COALESCE(cl.nombre, '(Cliente eliminado)') as cliente_nombre, 
          cl.empresa as cliente_empresa,
          c.usuario_id, COALESCE(u.nombre, '(Usuario eliminado)') as usuario_nombre,
          c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
          c.notas, c.validez_dias, c.fecha_validez, c.estado,
          c.stock_descontado, c.enviado_email, c.creado_en, c.actualizado_en,
          c.factura_numero, c.factura_fecha
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE 1=1
      `;

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (c.numero LIKE ? OR cl.nombre LIKE ? OR cl.empresa LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      if (estado) {
        params.push(estado);
        query += ` AND c.estado = ?`;
      }
      if (cliente_id) {
        params.push(Number(cliente_id));
        query += ` AND c.cliente_id = ?`;
      }
      if (fecha_desde) {
        params.push(fecha_desde);
        query += ` AND DATE(c.creado_en) >= ?`;
      }
      if (fecha_hasta) {
        params.push(fecha_hasta);
        query += ` AND DATE(c.creado_en) <= ?`;
      }
      query += ` ORDER BY c.creado_en DESC`;

      const result = await db.query(query, params);
      const cotizaciones = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], numero: row[1], cliente_id: row[2], cliente_nombre: row[3],
        cliente_empresa: row[4], usuario_id: row[5], usuario_nombre: row[6],
        subtotal: row[7], iva: row[8], descuento_porcentaje: row[9],
        descuento_monto: row[10], total: row[11], notas: row[12],
        validez_dias: row[13], fecha_validez: row[14], estado: row[15],
        stock_descontado: isStockDiscounted(row[16]), enviado_email: row[17],
        creado_en: row[18], actualizado_en: row[19],
        factura_numero: row[20], factura_fecha: row[21]
      })) : [];

      res.json(cotizaciones);
    } catch (error) {
      console.error('Error al obtener cotizaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getById(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cotizacion invalido' });
      }

      const query = `
        SELECT 
          c.id, c.numero, c.cliente_id, COALESCE(cl.nombre, '(Cliente eliminado)') as cliente_nombre, 
          cl.empresa as cliente_empresa, cl.rfc as cliente_rfc,
          cl.email as cliente_email, cl.telefono as cliente_telefono,
          cl.direccion as cliente_direccion,
          c.usuario_id, COALESCE(u.nombre, '(Usuario eliminado)') as usuario_nombre, u.email as usuario_email,
          c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
          c.notas, c.validez_dias, c.fecha_validez, c.estado,
          c.stock_descontado, c.enviado_email, c.creado_en, c.actualizado_en,
          c.factura_numero, c.factura_fecha
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.id = ?
      `;
      const result = await db.query(query, [id]);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }

      const row = result[0].values[0];
      const cotizacion = {
        id: row[0], numero: row[1], cliente_id: row[2], cliente_nombre: row[3],
        cliente_empresa: row[4], cliente_rfc: row[5], cliente_email: row[6],
        cliente_telefono: row[7], cliente_direccion: row[8],
        usuario_id: row[9], usuario_nombre: row[10], usuario_email: row[11],
        subtotal: row[12], iva: row[13], descuento_porcentaje: row[14],
        descuento_monto: row[15], total: row[16], notas: row[17],
        validez_dias: row[18], fecha_validez: row[19], estado: row[20],
        stock_descontado: isStockDiscounted(row[21]), enviado_email: row[22],
        creado_en: row[23], actualizado_en: row[24],
        factura_numero: row[25], factura_fecha: row[26]
      };

      const itemsResult = await db.query(`
        SELECT ci.id, ci.producto_id, p.nombre as producto_nombre,
               p.descripcion as producto_descripcion,
               ci.cantidad, ci.precio_unitario, ci.subtotal
        FROM cotizacion_items ci
        INNER JOIN productos p ON ci.producto_id = p.id
        WHERE ci.cotizacion_id = ?
        ORDER BY ci.id ASC
      `, [id]);

      cotizacion.items = itemsResult.length > 0 ? itemsResult[0].values.map(row => ({
        id: row[0], producto_id: row[1], producto_nombre: row[2],
        producto_descripcion: row[3], cantidad: row[4],
        precio_unitario: row[5], subtotal: row[6]
      })) : [];

      res.json(cotizacion);
    } catch (error) {
      console.error('Error al obtener cotización:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async create(req, res) {
    const { cliente_id, items, descuento_porcentaje, notas, validez_dias } = req.body;

    if (!cliente_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Cliente y al menos un item son requeridos' });
    }

    try {
      const db = await initDb();
      const clienteId = Number(cliente_id);

      if (!Number.isInteger(clienteId)) {
        return res.status(400).json({ error: 'Cliente invalido' });
      }

      // Consolidar items por producto (validacion en memoria, sin abrir conexion a la BD)
      const itemsPorProducto = new Map();
      for (const item of items) {
        const productoId = Number(item.producto_id);
        const cantidad = Number(item.cantidad);

        if (!Number.isInteger(productoId) || !Number.isFinite(cantidad) || cantidad <= 0) {
          return res.status(400).json({ error: 'Todos los items deben tener producto y cantidad valida' });
        }

        const current = itemsPorProducto.get(productoId) || {
          producto_id: productoId,
          cantidad: 0,
          precio_unitario_override: item.precio_unitario
        };
        current.cantidad += cantidad;
        itemsPorProducto.set(productoId, current);
      }

      const created = await db.transaction(async (tx) => {
        // Validar cliente y leer el IVA en una sola consulta (1 round-trip en vez de 2)
        const headResult = await tx.query(
          `SELECT
             (SELECT id FROM clientes WHERE id = ?) AS cliente_id,
             (SELECT valor FROM configuracion WHERE clave = ?) AS iva`,
          [clienteId, 'IVA_PORCENTAJE']
        );
        const headRow = firstRow(headResult);
        if (!headRow || headRow[0] === null || headRow[0] === undefined) {
          const error = new Error('Cliente no encontrado');
          error.statusCode = 404;
          throw error;
        }
        const ivaPorcentaje = headRow[1] != null ? parseFloat(headRow[1]) : 16;

        let subtotal = 0;
        const itemsValidados = [];

        // Traer todos los productos en una sola consulta (evita N round-trips por item)
        const ids = [...itemsPorProducto.keys()];
        const placeholders = ids.map(() => '?').join(', ');
        const prodResult = await tx.query(
          `SELECT id, nombre, precio_unitario, stock_actual FROM productos WHERE id IN (${placeholders})`,
          ids
        );
        const productosById = new Map();
        for (const prodRow of rows(prodResult)) {
          productosById.set(Number(prodRow[0]), prodRow);
        }

        for (const item of itemsPorProducto.values()) {
          const prodRow = productosById.get(item.producto_id);

          if (!prodRow) {
            const error = new Error(`Producto ${item.producto_id} no encontrado`);
            error.statusCode = 404;
            throw error;
          }

          const stockActual = Number(prodRow[3]);
          if (item.cantidad > stockActual) {
            const error = new Error(`Stock insuficiente para ${prodRow[1]}. Disponible: ${stockActual}`);
            error.statusCode = 400;
            throw error;
          }

          const precioUnitario = item.precio_unitario_override !== undefined && item.precio_unitario_override !== null
            ? Number(item.precio_unitario_override)
            : Number(prodRow[2]);

          if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
            const error = new Error(`Precio invalido para ${prodRow[1]}`);
            error.statusCode = 400;
            throw error;
          }

          const itemSubtotal = item.cantidad * precioUnitario;
          subtotal += itemSubtotal;
          itemsValidados.push({
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: precioUnitario,
            subtotal: itemSubtotal
          });
        }

        const descuentoMonto = descuento_porcentaje ? subtotal * (descuento_porcentaje / 100) : 0;
        const subtotalConDescuento = subtotal - descuentoMonto;
        const iva = subtotalConDescuento * (ivaPorcentaje / 100);
        const total = subtotalConDescuento + iva;

        const fechaValidez = new Date();
        fechaValidez.setDate(fechaValidez.getDate() + (validez_dias || 15));
        const numero = await generateBusinessNumber(tx, 'COT');

        const insertResult = await tx.query(`INSERT INTO cotizaciones
          (numero, cliente_id, usuario_id, subtotal, iva, descuento_porcentaje,
           descuento_monto, total, notas, validez_dias, fecha_validez)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
          [numero, clienteId, req.usuario.id, subtotal, iva, descuento_porcentaje || 0,
           descuentoMonto, total, notas || null, validez_dias || 15,
           fechaValidez.toISOString().split('T')[0]]
        );
        const insertRow = firstRow(insertResult);
        const cotizacionId = insertRow ? insertRow[0] : firstRow(await tx.query(`SELECT last_insert_rowid()`))[0];

        // Insertar todos los items en un solo INSERT multi-fila
        const valuesPlaceholders = itemsValidados.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const itemParams = [];
        for (const item of itemsValidados) {
          itemParams.push(cotizacionId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal);
        }
        await tx.run(
          `INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal)
           VALUES ${valuesPlaceholders}`,
          itemParams
        );

        return { cotizacionId, numero, total };
      });

      invalidateEstadisticasCache();
      await audit(req, {
        accion: 'crear',
        entidad: 'cotizacion',
        entidad_id: created.cotizacionId,
        detalle: { numero: created.numero, total: created.total }
      });

      return res.status(201).json({
        id: created.cotizacionId,
        numero: created.numero,
        message: 'Cotizacion creada exitosamente'
      });
    } catch (error) {
      console.error('Error al crear cotización:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async updateEstado(req, res) {
    try {
      const { estado } = req.body;
      const estadosValidos = ['pendiente', 'aceptada', 'rechazada', 'anulada'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado debe ser uno de: ${estadosValidos.join(', ')}` });
      }

      const db = await initDb();
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cotizacion invalido' });
      }

      const updated = await db.transaction(async (tx) => {
        const currentResult = await tx.query(`SELECT estado, stock_descontado FROM cotizaciones WHERE id = ?`, [id]);
        if (currentResult.length === 0 || currentResult[0].values.length === 0) {
          const error = new Error('Cotizacion no encontrada');
          error.statusCode = 404;
          throw error;
        }

        const estadoActual = currentResult[0].values[0][0];
        const stockDescontado = isStockDiscounted(currentResult[0].values[0][1]);

        if (estadoActual === 'facturada') {
          const error = new Error('Una venta facturada no puede cambiar de estado');
          error.statusCode = 400;
          throw error;
        }

        if (estadoActual === estado) {
          return { unchanged: true, estado, stock_descontado: stockDescontado };
        }

        let nextStockDescontado = stockDescontado;

        if (estado === 'aceptada' && !stockDescontado) {
          await descontarStockCotizacion(tx, req, id);
          nextStockDescontado = true;
        }

        if (estado !== 'aceptada' && stockDescontado) {
          await reponerStockCotizacion(tx, req, id);
          nextStockDescontado = false;
        }

        await tx.run(
          `UPDATE cotizaciones SET estado = ?, stock_descontado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
          [estado, STOCK_FLAG_TRUE(tx) === true ? nextStockDescontado : Number(nextStockDescontado), id]
        );

        return { unchanged: false, estado, stock_descontado: nextStockDescontado };
      });

      invalidateEstadisticasCache();
      await audit(req, {
        accion: 'cambiar_estado',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { estado, stock_descontado: updated.stock_descontado }
      });

      if (updated.unchanged) {
        return res.json({ message: 'Estado sin cambios', estado, stock_descontado: updated.stock_descontado });
      }

      return res.json({
        message: estado === 'aceptada'
          ? 'Cotizacion aceptada y stock descontado'
          : 'Estado actualizado',
        estado,
        stock_descontado: updated.stock_descontado
      });

      const currentResult = await db.exec(`SELECT estado, stock_descontado FROM cotizaciones WHERE id = ${id}`);
      if (currentResult.length === 0 || currentResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Cotizacion no encontrada' });
      }
      const estadoActual = currentResult[0].values[0][0];
      const stockDescontado = isStockDiscounted(currentResult[0].values[0][1]);

      if (estadoActual === 'facturada') {
        return res.status(400).json({ error: 'Una venta facturada no puede cambiar de estado' });
      }

      if (estadoActual === estado) {
        return res.json({ message: 'Estado sin cambios', estado, stock_descontado: stockDescontado });
      }

      await db.run('BEGIN');

      try {
        let nextStockDescontado = stockDescontado;

        if (estado === 'aceptada' && !stockDescontado) {
          await descontarStockCotizacion(db, req, id);
          nextStockDescontado = true;
        }

        if (estado !== 'aceptada' && stockDescontado) {
          await reponerStockCotizacion(db, req, id);
          nextStockDescontado = false;
        }

        await db.run(
          `UPDATE cotizaciones SET estado = ?, stock_descontado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
          [estado, STOCK_FLAG_TRUE(db) === true ? nextStockDescontado : Number(nextStockDescontado), id]
        );
        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      saveDb();
      await audit(req, {
        accion: 'cambiar_estado',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { estado, stock_descontado: estado === 'aceptada' }
      });

      res.json({
        message: estado === 'aceptada'
          ? 'Cotizacion aceptada y stock descontado'
          : 'Estado actualizado',
        estado,
        stock_descontado: estado === 'aceptada'
      });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async convertirVenta(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cotizacion invalido' });
      }

      const facturada = await db.transaction(async (tx) => {
        const cotResult = await tx.query(`SELECT estado, stock_descontado FROM cotizaciones WHERE id = ?`, [id]);
        if (cotResult.length === 0 || cotResult[0].values.length === 0) {
          const error = new Error('Cotizacion no encontrada');
          error.statusCode = 404;
          throw error;
        }

        const estadoVirtual = cotResult[0].values[0][0];
        const stockDescontado = isStockDiscounted(cotResult[0].values[0][1]);
        if (estadoVirtual === 'facturada') {
          const error = new Error('La cotizacion ya fue facturada previamente');
          error.statusCode = 400;
          throw error;
        }

        if (estadoVirtual !== 'aceptada') {
          const error = new Error('Solo una cotizacion aceptada puede convertirse en venta');
          error.statusCode = 400;
          throw error;
        }

        if (!stockDescontado) {
          await descontarStockCotizacion(tx, req, id);
        }

        const facturaNumero = await generateBusinessNumber(tx, 'FAC');
        const facturaFecha = new Date().toISOString();

        await tx.run(
          `UPDATE cotizaciones SET estado = 'facturada', stock_descontado = ?, actualizado_en = CURRENT_TIMESTAMP, factura_numero = ?, factura_fecha = ? WHERE id = ?`,
          [STOCK_FLAG_TRUE(tx), facturaNumero, facturaFecha, id]
        );

        return { facturaNumero };
      });

      invalidateEstadisticasCache();
      await audit(req, {
        accion: 'facturar',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { factura_numero: facturada.facturaNumero, stock_descontado: true }
      });

      return res.json({ message: 'Convertida a venta facturada exitosamente.', factura_numero: facturada.facturaNumero });

      const cotResult = await db.exec(`SELECT estado, stock_descontado FROM cotizaciones WHERE id = ${id}`);
      if (cotResult.length === 0 || cotResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }

      const estadoVirtual = cotResult[0].values[0][0];
      const stockDescontado = isStockDiscounted(cotResult[0].values[0][1]);
      if (estadoVirtual === 'facturada') {
        return res.status(400).json({ error: 'La cotización ya fue facturada previamente' });
      }

      if (estadoVirtual !== 'aceptada') {
        return res.status(400).json({ error: 'Solo una cotizacion aceptada puede convertirse en venta' });
      }

      // Generar número factura
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const countResult = await db.exec(`SELECT COUNT(factura_numero) FROM cotizaciones WHERE strftime('%Y', factura_fecha) = '${year}'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      const facturaNumero = `FAC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
      const facturaFecha = fecha.toISOString();

      await db.run('BEGIN');

      try {
        if (!stockDescontado) {
          await descontarStockCotizacion(db, req, id);
        }

        await db.run(
          `UPDATE cotizaciones SET estado = 'facturada', stock_descontado = ?, actualizado_en = CURRENT_TIMESTAMP, factura_numero = ?, factura_fecha = ? WHERE id = ?`,
          [STOCK_FLAG_TRUE(db), facturaNumero, facturaFecha, id]
        );
        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      saveDb();
      await audit(req, {
        accion: 'facturar',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { factura_numero: facturaNumero, stock_descontado: true }
      });

      res.json({ message: 'Convertida a venta facturada exitosamente.', factura_numero: facturaNumero });
    } catch (error) {
      console.error('Error al facturar la venta:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error interno del servidor al facturar' });
    }
  }

  async enviarEmail(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cotizacion invalido' });
      }
      const result = await db.query(`
        SELECT cl.email, c.numero
        FROM cotizaciones c
        JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.id = ?
      `, [id]);

      if (result.length === 0 || result[0].values.length === 0 || !result[0].values[0][0]) {
        return res.status(400).json({ error: 'El cliente no tiene correo electrónico' });
      }

      const emailCliente = result[0].values[0][0];
      const numeroCoti = result[0].values[0][1];

      const { enviarCotizacionEmail } = require('../utils/emailService');
      const { generarPDFCotizacion } = require('../utils/pdfGenerator');

      const doc = await generarPDFCotizacion(id);

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        try {
          await enviarCotizacionEmail(emailCliente, pdfData, numeroCoti);
          await db.run(`UPDATE cotizaciones SET enviado_email = 1 WHERE id = ?`, [id]);
          saveDb();
          res.json({ message: 'Email enviado correctamente' });
        } catch (emailError) {
          console.error(emailError);
          res.status(500).json({ error: 'Error al enviar email' });
        }
      });
      doc.end();
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async descargarFactura(req, res) {
    try {
      const { generarPDFFactura } = require('../utils/pdfGenerator');
      const doc = await generarPDFFactura(req.params.id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=factura-${req.params.id}.pdf`);
      
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error('Error al generar PDF de factura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cotizacion invalido' });
      }

      const deleted = await db.transaction(async (tx) => {
        const currentResult = await tx.query(`SELECT estado, stock_descontado FROM cotizaciones WHERE id = ?`, [id]);
        if (currentResult.length > 0 && currentResult[0].values.length > 0 && currentResult[0].values[0][0] === 'facturada') {
          const error = new Error('Una venta facturada no puede eliminarse');
          error.statusCode = 400;
          throw error;
        }

        const stockDescontado = currentResult.length > 0 && currentResult[0].values.length > 0
          ? isStockDiscounted(currentResult[0].values[0][1])
          : false;

        if (stockDescontado) {
          await reponerStockCotizacion(tx, req, id);
        }

        await tx.run(`DELETE FROM cotizaciones WHERE id = ?`, [id]);
        return { stockDescontado };
      });

      invalidateEstadisticasCache();
      await audit(req, {
        accion: 'eliminar',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { stock_repuesto: deleted.stockDescontado }
      });
      return res.json({ message: 'Cotización eliminada correctamente' });

      const currentResult = await db.exec(`SELECT estado, stock_descontado FROM cotizaciones WHERE id = ${id}`);
      if (currentResult.length > 0 && currentResult[0].values.length > 0 && currentResult[0].values[0][0] === 'facturada') {
        return res.status(400).json({ error: 'Una venta facturada no puede eliminarse' });
      }

      const stockDescontado = currentResult.length > 0 && currentResult[0].values.length > 0
        ? isStockDiscounted(currentResult[0].values[0][1])
        : false;

      await db.run('BEGIN');

      try {
        if (stockDescontado) {
          await reponerStockCotizacion(db, req, id);
        }

        await db.run(`DELETE FROM cotizaciones WHERE id = ?`, [id]);
        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
      saveDb();
      await audit(req, {
        accion: 'eliminar',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { stock_repuesto: stockDescontado }
      });
      res.json({ message: 'Cotización eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  async buildEstadisticas() {
    try {
      const db = await initDb();
      
      const resumenCotizacionesResult = await db.exec(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN estado = 'aceptada' THEN 1 ELSE 0 END) as aceptadas,
          COALESCE(SUM(total), 0) as valor_total,
          COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END), 0) as valor_pendiente,
          COALESCE(SUM(CASE WHEN estado IN ('aceptada', 'facturada') THEN total ELSE 0 END), 0) as valor_aceptado,
          COALESCE(AVG(total), 0) as ticket_promedio
        FROM cotizaciones
      `);

      const resumenInventarioResult = await db.exec(`
        SELECT
          COUNT(*) as total_productos,
          COALESCE(SUM(stock_actual), 0) as unidades_stock,
          COALESCE(SUM(precio_unitario * stock_actual), 0) as valor_inventario,
          SUM(CASE WHEN stock_actual < 10 THEN 1 ELSE 0 END) as bajo_stock_count
        FROM productos
      `);

      const resumenCotizaciones = resumenCotizacionesResult[0]?.values[0] || [0, 0, 0, 0, 0, 0, 0];
      const resumenInventario = resumenInventarioResult[0]?.values[0] || [0, 0, 0, 0];
      const total = resumenCotizaciones[0] || 0;
      const pendientes = resumenCotizaciones[1] || 0;
      const aceptadas = resumenCotizaciones[2] || 0;
      const valorTotal = resumenCotizaciones[3] || 0;
      const valorPendiente = resumenCotizaciones[4] || 0;
      const valorAceptado = resumenCotizaciones[5] || 0;
      const ticketPromedio = resumenCotizaciones[6] || 0;
      const totalProductos = resumenInventario[0] || 0;
      const unidadesStock = resumenInventario[1] || 0;
      const valorInventario = resumenInventario[2] || 0;
      const productosBajoStockCount = resumenInventario[3] || 0;
      const tasaConversion = total > 0 ? Math.round((Number(aceptadas) / Number(total)) * 100) : 0;

      const pipelineResult = await db.exec(`
        SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as valor
        FROM cotizaciones
        GROUP BY estado
        ORDER BY valor DESC
      `);

      const categoriasInventarioResult = await db.exec(`
        SELECT COALESCE(c.nombre, 'Sin categoria') as categoria,
               COUNT(p.id) as productos,
               COALESCE(SUM(p.stock_actual), 0) as unidades,
               COALESCE(SUM(p.precio_unitario * p.stock_actual), 0) as valor
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        GROUP BY c.nombre
        ORDER BY valor DESC
      `);

      // Obtener ventas por día (últimos 7 días para la gráfica)
      const ventasDiaResult = await db.exec(`
        SELECT DATE(creado_en) as fecha, SUM(total) as total 
        FROM cotizaciones 
        WHERE estado = 'facturada' AND creado_en >= date('now', '-7 days') 
        GROUP BY DATE(creado_en) 
        ORDER BY fecha ASC
      `);
      
      const ventasPorDia = [];
      if (ventasDiaResult.length > 0) {
        ventasDiaResult[0].values.forEach(row => {
          ventasPorDia.push({ fecha: row[0], total: row[1] });
        });
      }

      // Obtener top productos más vendidos
      const topProdResult = await db.exec(`
        SELECT p.nombre, sum(ci.cantidad) as cantidad_vendida
        FROM cotizacion_items ci
        JOIN cotizaciones c ON c.id = ci.cotizacion_id
        JOIN productos p ON p.id = ci.producto_id
        WHERE c.estado = 'facturada' OR c.estado = 'aceptada'
        GROUP BY p.id
        ORDER BY cantidad_vendida DESC
        LIMIT 5
      `);
      
      const topProductos = [];
      if (topProdResult.length > 0) {
        topProdResult[0].values.forEach(row => {
          topProductos.push({ nombre: row[0], cantidad: row[1] });
        });
      }

      const bajoStockListResult = await db.exec(`
        SELECT id, nombre, stock_actual, unidad_medida 
        FROM productos 
        WHERE stock_actual < 10 
        ORDER BY stock_actual ASC 
        LIMIT 5
      `);
      
      const bajoStockLista = [];
      if (bajoStockListResult.length > 0) {
        bajoStockListResult[0].values.forEach(row => {
          bajoStockLista.push({ id: row[0], nombre: row[1], stock: row[2], unidad: row[3] });
        });
      }

      return {
        total,
        pendientes,
        aceptadas,
        valor_total: valorTotal,
        valor_pendiente: valorPendiente,
        valor_aceptado: valorAceptado,
        ticket_promedio: ticketPromedio,
        tasa_conversion: tasaConversion,
        total_productos: totalProductos,
        unidades_stock: unidadesStock,
        valor_inventario: valorInventario,
        pipeline: pipelineResult.length > 0 ? pipelineResult[0].values.map(row => ({
          estado: row[0],
          cantidad: row[1],
          valor: row[2]
        })) : [],
        categoriasInventario: categoriasInventarioResult.length > 0 ? categoriasInventarioResult[0].values.map(row => ({
          categoria: row[0],
          productos: row[1],
          unidades: row[2],
          valor: row[3]
        })) : [],
        ventasPorDia,
        topProductos,
        bajoStockCount: productosBajoStockCount,
        bajoStockLista
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }

  async getEstadisticas(req, res) {
    try {
      const now = Date.now();

      if (estadisticasCache && estadisticasCache.expiresAt > now) {
        return res.json(estadisticasCache.data);
      }

      if (!estadisticasInFlight) {
        estadisticasInFlight = CotizacionController.prototype.buildEstadisticas()
          .then(data => {
            estadisticasCache = {
              data,
              expiresAt: Date.now() + ESTADISTICAS_CACHE_MS
            };
            return data;
          })
          .finally(() => {
            estadisticasInFlight = null;
          });
      }

      const data = await estadisticasInFlight;
      res.json(data);
    } catch (error) {
      console.error('Error al obtener estadisticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new CotizacionController();
