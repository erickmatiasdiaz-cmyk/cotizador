const { initDb, saveDb } = require('../config/database');

class CotizacionController {
  async getAll(req, res) {
    try {
      const { search, estado, cliente_id, fecha_desde, fecha_hasta } = req.query;
      const db = await initDb();
      
      let query = `
        SELECT 
          c.id, c.numero, c.cliente_id, cl.nombre as cliente_nombre, 
          cl.empresa as cliente_empresa,
          c.usuario_id, u.nombre as usuario_nombre,
          c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
          c.notas, c.validez_dias, c.fecha_validez, c.estado,
          c.enviado_email, c.creado_en, c.actualizado_en,
          c.factura_numero, c.factura_fecha
        FROM cotizaciones c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        INNER JOIN usuarios u ON c.usuario_id = u.id
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

      const result = db.exec(query);
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
          c.id, c.numero, c.cliente_id, cl.nombre as cliente_nombre, 
          cl.empresa as cliente_empresa, cl.rfc as cliente_rfc,
          cl.email as cliente_email, cl.telefono as cliente_telefono,
          cl.direccion as cliente_direccion,
          c.usuario_id, u.nombre as usuario_nombre, u.email as usuario_email,
          c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
          c.notas, c.validez_dias, c.fecha_validez, c.estado,
          c.enviado_email, c.creado_en, c.actualizado_en,
          c.factura_numero, c.factura_fecha
        FROM cotizaciones c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        INNER JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.id = ${req.params.id}
      `;
      const result = db.exec(query);
      
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

      const itemsResult = db.exec(`
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
      const clienteResult = db.exec(`SELECT id FROM clientes WHERE id = ${cliente_id}`);
      if (clienteResult.length === 0 || clienteResult[0].values.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Generar número
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const countResult = db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE strftime('%Y', creado_en) = '${year}'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      const numero = `COT-${year}${month}-${String(count + 1).padStart(4, '0')}`;

      // Calcular totales
      let subtotal = 0;
      for (const item of items) {
        const prodResult = db.exec(`SELECT precio_unitario FROM productos WHERE id = ${item.producto_id}`);
        const precioUnitario = item.precio_unitario || (prodResult.length > 0 ? prodResult[0].values[0][0] : 0);
        subtotal += item.cantidad * precioUnitario;
      }

      const configResult = db.exec(`SELECT valor FROM configuracion WHERE clave = 'IVA_PORCENTAJE'`);
      const ivaPorcentaje = configResult.length > 0 ? parseFloat(configResult[0].values[0][0]) : 16;
      const descuentoMonto = descuento_porcentaje ? subtotal * (descuento_porcentaje / 100) : 0;
      const subtotalConDescuento = subtotal - descuentoMonto;
      const iva = subtotalConDescuento * (ivaPorcentaje / 100);
      const total = subtotalConDescuento + iva;

      const fechaValidez = new Date();
      fechaValidez.setDate(fechaValidez.getDate() + (validez_dias || 15));

      // Insertar cotización
      db.run(`INSERT INTO cotizaciones 
        (numero, cliente_id, usuario_id, subtotal, iva, descuento_porcentaje, 
         descuento_monto, total, notas, validez_dias, fecha_validez) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [numero, cliente_id, req.usuario.id, subtotal, iva, descuento_porcentaje || 0,
         descuentoMonto, total, notas || null, validez_dias || 15,
         fechaValidez.toISOString().split('T')[0]]);
      saveDb();

      const cotizacionResult = db.exec(`SELECT id FROM cotizaciones WHERE numero = '${numero}'`);
      const cotizacionId = cotizacionResult[0].values[0][0];

      // Insertar items
      const insertItem = db.prepare(`
        INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const prodResult = db.exec(`SELECT precio_unitario FROM productos WHERE id = ${item.producto_id}`);
        const precioUnitario = item.precio_unitario || (prodResult.length > 0 ? prodResult[0].values[0][0] : 0);
        const itemSubtotal = item.cantidad * precioUnitario;
        insertItem.run([cotizacionId, item.producto_id, item.cantidad, precioUnitario, itemSubtotal]);
      }
      saveDb();

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
      db.run(`UPDATE cotizaciones SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
        [estado, req.params.id]);
      saveDb();

      res.json({ message: 'Estado actualizado', estado });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async convertirVenta(req, res) {
    try {
      const db = await initDb();
      const { id } = req.params;

      const cotResult = db.exec(`SELECT estado FROM cotizaciones WHERE id = ${id}`);
      if (cotResult.length === 0) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }

      const estadoVirtual = cotResult[0].values[0][0];
      if (estadoVirtual === 'facturada') {
        return res.status(400).json({ error: 'La cotización ya fue facturada previamente' });
      }

      // Restar el stock en SQLite
      const itemsResult = db.exec(`SELECT producto_id, cantidad FROM cotizacion_items WHERE cotizacion_id = ${id}`);
      if (itemsResult.length > 0) {
        const items = itemsResult[0].values;
        for (const item of items) {
          db.run(`UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?`, [item[1], item[0]]);
        }
      }

      // Generar número factura
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const countResult = db.exec(`SELECT COUNT(factura_numero) FROM cotizaciones WHERE strftime('%Y', factura_fecha) = '${year}'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      const facturaNumero = `FAC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
      const facturaFecha = fecha.toISOString();

      // Marcarla como facturada
      db.run(`UPDATE cotizaciones SET estado = 'facturada', actualizado_en = CURRENT_TIMESTAMP, factura_numero = ?, factura_fecha = ? WHERE id = ?`, 
        [facturaNumero, facturaFecha, id]);
      saveDb();

      res.json({ message: 'Convertida a venta exitosamente. Stock descontado.' });
    } catch (error) {
      console.error('Error al facturar la venta:', error);
      res.status(500).json({ error: 'Error interno del servidor al facturar' });
    }
  }

  async enviarEmail(req, res) {
    try {
      const db = await initDb();
      const result = db.exec(`
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
          db.run(`UPDATE cotizaciones SET enviado_email = 1 WHERE id = ${req.params.id}`);
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
      db.run(`DELETE FROM cotizaciones WHERE id = ?`, [req.params.id]);
      saveDb();
      res.json({ message: 'Cotización eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar cotización:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getEstadisticas(req, res) {
    try {
      const db = await initDb();
      
      const totalResult = db.exec(`SELECT COUNT(*) FROM cotizaciones`);
      const pendientesResult = db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE estado = 'pendiente'`);
      const aceptadasResult = db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE estado = 'aceptada'`);
      const valorTotalResult = db.exec(`SELECT COALESCE(SUM(total), 0) FROM cotizaciones`);

      const total = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;
      const pendientes = pendientesResult.length > 0 ? pendientesResult[0].values[0][0] : 0;
      const aceptadas = aceptadasResult.length > 0 ? aceptadasResult[0].values[0][0] : 0;
      const valorTotal = valorTotalResult.length > 0 && valorTotalResult[0].values[0][0] !== null ? valorTotalResult[0].values[0][0] : 0;

      // Obtener ventas por día (últimos 7 días para la gráfica)
      const ventasDiaResult = db.exec(`
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
      const topProdResult = db.exec(`
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

      res.json({
        total,
        pendientes,
        aceptadas,
        valor_total: valorTotal,
        ventasPorDia,
        topProductos
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new CotizacionController();
