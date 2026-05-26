const { initDb, saveDb } = require('../config/database');
const { audit } = require('../utils/auditLogger');

class CotizacionController {
  async getAll(req, res) {
    try {
      const { search, estado, cliente_id, fecha_desde, fecha_hasta } = req.query;
      const db = await initDb();
      
      let query = `
        SELECT 
          c.id, c.numero, c.cliente_id, COALESCE(cl.nombre, '(Cliente eliminado)') as cliente_nombre, 
          cl.empresa as cliente_empresa,
          c.usuario_id, COALESCE(u.nombre, '(Usuario eliminado)') as usuario_nombre,
          c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
          c.notas, c.validez_dias, c.fecha_validez, c.estado,
          c.enviado_email, c.creado_en, c.actualizado_en,
          c.factura_numero, c.factura_fecha
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE 1=1
      `;

      if (search) {
        query += ` AND (c.numero LIKE '%${search}%' OR cl.nombre LIKE '%${search}%' OR cl.empresa LIKE '%${search}%')`;
      }
      if (estado) {
        query += ` AND c.estado = '${estado}'`;
      }
      if (cliente_id) {
        query += ` AND c.cliente_id = ${cliente_id}`;
      }
      if (fecha_desde) {
        query += ` AND DATE(c.creado_en) >= '${fecha_desde}'`;
      }
      if (fecha_hasta) {
        query += ` AND DATE(c.creado_en) <= '${fecha_hasta}'`;
      }
      query += ` ORDER BY c.creado_en DESC`;

      const result = await db.exec(query);
      const cotizaciones = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], numero: row[1], cliente_id: row[2], cliente_nombre: row[3],
        cliente_empresa: row[4], usuario_id: row[5], usuario_nombre: row[6],
        subtotal: row[7], iva: row[8], descuento_porcentaje: row[9],
        descuento_monto: row[10], total: row[11], notas: row[12],
        validez_dias: row[13], fecha_validez: row[14], estado: row[15],
        enviado_email: row[16], creado_en: row[17], actualizado_en: row[18],
        factura_numero: row[19], factura_fecha: row[20]
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
      const query = `
        SELECT 
          c.id, c.numero, c.cliente_id, COALESCE(cl.nombre, '(Cliente eliminado)') as cliente_nombre, 
          cl.empresa as cliente_empresa, cl.rfc as cliente_rfc,
          cl.email as cliente_email, cl.telefono as cliente_telefono,
          cl.direccion as cliente_direccion,
          c.usuario_id, COALESCE(u.nombre, '(Usuario eliminado)') as usuario_nombre, u.email as usuario_email,
          c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
          c.notas, c.validez_dias, c.fecha_validez, c.estado,
          c.enviado_email, c.creado_en, c.actualizado_en,
          c.factura_numero, c.factura_fecha
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.id = ${req.params.id}
      `;
      const result = await db.exec(query);
      
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
        enviado_email: row[21], creado_en: row[22], actualizado_en: row[23],
        factura_numero: row[24], factura_fecha: row[25]
      };

      const itemsResult = await db.exec(`
        SELECT ci.id, ci.producto_id, p.nombre as producto_nombre,
               p.descripcion as producto_descripcion,
               ci.cantidad, ci.precio_unitario, ci.subtotal
        FROM cotizacion_items ci
        INNER JOIN productos p ON ci.producto_id = p.id
        WHERE ci.cotizacion_id = ${req.params.id}
        ORDER BY ci.id ASC
      `);

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

      // Verificar cliente
      const clienteResult = await db.exec(`SELECT id FROM clientes WHERE id = ${cliente_id}`);
      if (clienteResult.length === 0 || clienteResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Generar número
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const countResult = await db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE strftime('%Y', creado_en) = '${year}'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      const numero = `COT-${year}${month}-${String(count + 1).padStart(4, '0')}`;

      // Calcular totales y validar stock disponible.
      let subtotal = 0;
      const itemsValidados = [];

      for (const item of items) {
        const productoId = Number(item.producto_id);
        const cantidad = Number(item.cantidad);

        if (!Number.isInteger(productoId) || !Number.isFinite(cantidad) || cantidad <= 0) {
          return res.status(400).json({ error: 'Todos los items deben tener producto y cantidad valida' });
        }

        const prodResult = await db.exec(`SELECT id, nombre, precio_unitario, stock_actual FROM productos WHERE id = ${productoId}`);
        if (prodResult.length === 0 || prodResult[0].values.length === 0) {
          return res.status(404).json({ error: `Producto ${productoId} no encontrado` });
        }

        const prodRow = prodResult[0].values[0];
        const stockActual = Number(prodRow[3]);

        if (cantidad > stockActual) {
          return res.status(400).json({
            error: `Stock insuficiente para ${prodRow[1]}. Disponible: ${stockActual}`
          });
        }

        const precioUnitario = item.precio_unitario !== undefined && item.precio_unitario !== null
          ? Number(item.precio_unitario)
          : Number(prodRow[2]);

        if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
          return res.status(400).json({ error: `Precio invalido para ${prodRow[1]}` });
        }

        const itemSubtotal = cantidad * precioUnitario;
        subtotal += itemSubtotal;
        itemsValidados.push({ producto_id: productoId, cantidad, precio_unitario: precioUnitario, subtotal: itemSubtotal });
      }

      const configResult = await db.exec(`SELECT valor FROM configuracion WHERE clave = 'IVA_PORCENTAJE'`);
      const ivaPorcentaje = configResult.length > 0 ? parseFloat(configResult[0].values[0][0]) : 16;
      const descuentoMonto = descuento_porcentaje ? subtotal * (descuento_porcentaje / 100) : 0;
      const subtotalConDescuento = subtotal - descuentoMonto;
      const iva = subtotalConDescuento * (ivaPorcentaje / 100);
      const total = subtotalConDescuento + iva;

      const fechaValidez = new Date();
      fechaValidez.setDate(fechaValidez.getDate() + (validez_dias || 15));

      // Insertar cotización
      await db.run(`INSERT INTO cotizaciones 
        (numero, cliente_id, usuario_id, subtotal, iva, descuento_porcentaje, 
         descuento_monto, total, notas, validez_dias, fecha_validez) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [numero, cliente_id, req.usuario.id, subtotal, iva, descuento_porcentaje || 0,
         descuentoMonto, total, notas || null, validez_dias || 15,
         fechaValidez.toISOString().split('T')[0]]);
      saveDb();

      const cotizacionResult = await db.exec(`SELECT id FROM cotizaciones WHERE numero = '${numero}'`);
      const cotizacionId = cotizacionResult[0].values[0][0];

      // Insertar items
      const insertItem = db.prepare(`
        INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of itemsValidados) {
        await insertItem.run([cotizacionId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]);
      }
      saveDb();
      await audit(req, {
        accion: 'crear',
        entidad: 'cotizacion',
        entidad_id: cotizacionId,
        detalle: { numero, total }
      });

      res.status(201).json({ id: cotizacionId, message: 'Cotización creada exitosamente' });
    } catch (error) {
      console.error('Error al crear cotización:', error);
      res.status(500).json({ error: error.message || 'Error interno del servidor' });
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
      const currentResult = await db.exec(`SELECT estado FROM cotizaciones WHERE id = ${Number(req.params.id)}`);
      if (currentResult.length === 0 || currentResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Cotizacion no encontrada' });
      }
      if (currentResult[0].values[0][0] === 'facturada') {
        return res.status(400).json({ error: 'Una venta facturada no puede cambiar de estado' });
      }

      await db.run(`UPDATE cotizaciones SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
        [estado, req.params.id]);
      saveDb();
      await audit(req, {
        accion: 'cambiar_estado',
        entidad: 'cotizacion',
        entidad_id: Number(req.params.id),
        detalle: { estado }
      });

      res.json({ message: 'Estado actualizado', estado });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async convertirVenta(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cotizacion invalido' });
      }

      const cotResult = await db.exec(`SELECT estado FROM cotizaciones WHERE id = ${id}`);
      if (cotResult.length === 0 || cotResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }

      const estadoVirtual = cotResult[0].values[0][0];
      if (estadoVirtual === 'facturada') {
        return res.status(400).json({ error: 'La cotización ya fue facturada previamente' });
      }

      if (estadoVirtual !== 'aceptada') {
        return res.status(400).json({ error: 'Solo una cotizacion aceptada puede convertirse en venta' });
      }

      const itemsResult = await db.exec(`
        SELECT ci.producto_id, ci.cantidad, p.nombre, p.stock_actual
        FROM cotizacion_items ci
        JOIN productos p ON p.id = ci.producto_id
        WHERE ci.cotizacion_id = ${id}
      `);

      if (itemsResult.length === 0 || itemsResult[0].values.length === 0) {
        return res.status(400).json({ error: 'La cotizacion no tiene productos para facturar' });
      }

      const items = itemsResult[0].values;
      for (const item of items) {
        const cantidad = Number(item[1]);
        const stockActual = Number(item[3]);

        if (cantidad > stockActual) {
          return res.status(400).json({
            error: `Stock insuficiente para ${item[2]}. Disponible: ${stockActual}, requerido: ${cantidad}`
          });
        }
      }

      for (const item of items) {
        await db.run(`UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?`, [item[1], item[0]]);
        try {
          await db.run(
            `INSERT INTO stock_movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [item[0], req.usuario.id, 'venta_salida', item[1], item[3], Number(item[3]) - Number(item[1]), `Venta desde cotizacion ${id}`]
          );
        } catch (error) {
          if (!String(error.message || '').includes('stock_movimientos')) {
            console.error('Error al registrar salida de stock:', error.message);
          }
        }
      }

      // Generar número factura
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const countResult = await db.exec(`SELECT COUNT(factura_numero) FROM cotizaciones WHERE strftime('%Y', factura_fecha) = '${year}'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      const facturaNumero = `FAC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
      const facturaFecha = fecha.toISOString();

      // Marcarla como facturada
      await db.run(`UPDATE cotizaciones SET estado = 'facturada', actualizado_en = CURRENT_TIMESTAMP, factura_numero = ?, factura_fecha = ? WHERE id = ?`, 
        [facturaNumero, facturaFecha, id]);
      saveDb();
      await audit(req, {
        accion: 'facturar',
        entidad: 'cotizacion',
        entidad_id: id,
        detalle: { factura_numero: facturaNumero }
      });

      res.json({ message: 'Convertida a venta exitosamente. Stock descontado.', factura_numero: facturaNumero });
    } catch (error) {
      console.error('Error al facturar la venta:', error);
      res.status(500).json({ error: 'Error interno del servidor al facturar' });
    }
  }

  async enviarEmail(req, res) {
    try {
      const db = await initDb();
      const result = await db.exec(`
        SELECT cl.email, c.numero 
        FROM cotizaciones c 
        JOIN clientes cl ON c.cliente_id = cl.id 
        WHERE c.id = ${req.params.id}
      `);

      if (result.length === 0 || !result[0].values[0][0]) {
        return res.status(400).json({ error: 'El cliente no tiene correo electrónico' });
      }

      const emailCliente = result[0].values[0][0];
      const numeroCoti = result[0].values[0][1];

      const { enviarCotizacionEmail } = require('../utils/emailService');
      const { generarPDFCotizacion } = require('../utils/pdfGenerator');

      const doc = await generarPDFCotizacion(req.params.id);
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        try {
          await enviarCotizacionEmail(emailCliente, pdfData, numeroCoti);
          await db.run(`UPDATE cotizaciones SET enviado_email = 1 WHERE id = ${req.params.id}`);
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
      const currentResult = await db.exec(`SELECT estado FROM cotizaciones WHERE id = ${Number(req.params.id)}`);
      if (currentResult.length > 0 && currentResult[0].values.length > 0 && currentResult[0].values[0][0] === 'facturada') {
        return res.status(400).json({ error: 'Una venta facturada no puede eliminarse' });
      }

      await db.run(`DELETE FROM cotizaciones WHERE id = ?`, [req.params.id]);
      saveDb();
      await audit(req, {
        accion: 'eliminar',
        entidad: 'cotizacion',
        entidad_id: Number(req.params.id)
      });
      res.json({ message: 'Cotización eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getEstadisticas(req, res) {
    try {
      const db = await initDb();
      
      const totalResult = await db.exec(`SELECT COUNT(*) FROM cotizaciones`);
      const pendientesResult = await db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE estado = 'pendiente'`);
      const aceptadasResult = await db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE estado = 'aceptada'`);
      const valorTotalResult = await db.exec(`SELECT COALESCE(SUM(total), 0) FROM cotizaciones`);
      const valorPendienteResult = await db.exec(`SELECT COALESCE(SUM(total), 0) FROM cotizaciones WHERE estado = 'pendiente'`);
      const valorAceptadoResult = await db.exec(`SELECT COALESCE(SUM(total), 0) FROM cotizaciones WHERE estado IN ('aceptada', 'facturada')`);
      const ticketPromedioResult = await db.exec(`SELECT COALESCE(AVG(total), 0) FROM cotizaciones`);
      const productosResult = await db.exec(`SELECT COUNT(*) FROM productos`);
      const unidadesStockResult = await db.exec(`SELECT COALESCE(SUM(stock_actual), 0) FROM productos`);
      const valorInventarioResult = await db.exec(`SELECT COALESCE(SUM(precio_unitario * stock_actual), 0) FROM productos`);

      const total = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;
      const pendientes = pendientesResult.length > 0 ? pendientesResult[0].values[0][0] : 0;
      const aceptadas = aceptadasResult.length > 0 ? aceptadasResult[0].values[0][0] : 0;
      const valorTotal = valorTotalResult.length > 0 && valorTotalResult[0].values[0][0] !== null ? valorTotalResult[0].values[0][0] : 0;
      const valorPendiente = valorPendienteResult.length > 0 ? valorPendienteResult[0].values[0][0] : 0;
      const valorAceptado = valorAceptadoResult.length > 0 ? valorAceptadoResult[0].values[0][0] : 0;
      const ticketPromedio = ticketPromedioResult.length > 0 ? ticketPromedioResult[0].values[0][0] : 0;
      const totalProductos = productosResult.length > 0 ? productosResult[0].values[0][0] : 0;
      const unidadesStock = unidadesStockResult.length > 0 ? unidadesStockResult[0].values[0][0] : 0;
      const valorInventario = valorInventarioResult.length > 0 ? valorInventarioResult[0].values[0][0] : 0;
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

      // Obtener productos con bajo stock (umbral < 10)
      const bajoStockCountResult = await db.exec(`SELECT COUNT(*) FROM productos WHERE stock_actual < 10`);
      const productosBajoStockCount = bajoStockCountResult.length > 0 ? bajoStockCountResult[0].values[0][0] : 0;

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

      res.json({
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
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new CotizacionController();
