const { initDb, saveDb } = require('../config/database');
const { enviarNotificacionPedidoWeb } = require('../utils/emailService');

class PublicController {
  async getConfiguracion(req, res) {
    try {
      const db = await initDb();
      const config = {};
      const configResult = await db.exec(`SELECT clave, valor FROM configuracion`);
      if (configResult.length > 0) {
        configResult[0].values.forEach(row => {
          // No mandar datos sensibles si existieran, pero es config general web
          config[row[0]] = row[1];
        });
      }
      res.json(config);
    } catch (error) {
      console.error('Error public configuracion:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getProductos(req, res) {
    try {
      const db = await initDb();
      // Solo traemos los que tengan nombre, podemos filtrar stock > 0 si fuera necesario
      const query = `
        SELECT p.id, p.nombre, p.descripcion, p.categoria_id, c.nombre as categoria,
               p.precio_unitario, p.stock_actual, p.unidad_medida, p.imagen_url
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ORDER BY c.nombre ASC, p.nombre ASC
      `;
      const result = await db.exec(query);
      const productos = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], nombre: row[1], descripcion: row[2], categoria_id: row[3],
        categoria: row[4], precio_unitario: row[5], stock_actual: row[6],
        unidad_medida: row[7], imagen_url: row[8]
      })) : [];

      res.json(productos);
    } catch (error) {
      console.error('Error public productos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getCategorias(req, res) {
    try {
      const db = await initDb();
      const query = `SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC`;
      const result = await db.exec(query);
      const categorias = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], nombre: row[1], descripcion: row[2]
      })) : [];

      res.json(categorias);
    } catch (error) {
      console.error('Error public categorias:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async solicitarPedido(req, res) {
    const { nombre, email, telefono, direccion, carrito } = req.body;

    if (!nombre || !email || !carrito || carrito.length === 0) {
      return res.status(400).json({ error: 'Nombre, email y al menos un producto son requeridos' });
    }

    try {
      const db = await initDb();

      // 1. Gestionar Cliente
      let cliente_id;
      const clienteResult = await db.exec(`SELECT id FROM clientes WHERE lower(email) = lower('${email.replace(/'/g, "''")}')`);
      const clienteRow = clienteResult.length > 0 && clienteResult[0].values.length > 0
        ? clienteResult[0].values[0]
        : null;

      if (clienteRow) {
        cliente_id = clienteRow[0];
        // Opcionalmente actualizar teléfono y dirección si están en blanco? Lo dejamos tal cual.
      } else {
        // Crear nuevo cliente
        await db.run(`INSERT INTO clientes (nombre, email, telefono, direccion, tipo) VALUES (?, ?, ?, ?, 'natural')`,
          [nombre, email, telefono || null, direccion || null]);
        saveDb();
        const nClientResult = await db.exec(`SELECT last_insert_rowid()`);
        cliente_id = nClientResult[0].values[0][0];
      }

      // 2. Determinar Usuario (Vendedor) Asignado
      // Asignamos al primer admin/vendedor del sistema (usuario raiz)
      let usuario_id = 1;
      const usrResult = await db.exec(`SELECT id FROM usuarios LIMIT 1`);
      if (usrResult.length > 0) {
        usuario_id = usrResult[0].values[0][0];
      }

      // 3. Generar número de cotización/pedido
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const countResult = await db.exec(`SELECT COUNT(*) FROM cotizaciones WHERE strftime('%Y', creado_en) = '${year}'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      const numero = `WEB-${year}${month}-${String(count + 1).padStart(4, '0')}`;

      // 4. Calcular totales reales desde la BD para seguridad antimanipulación
      let subtotal = 0;
      const validItems = [];
      
      for (const item of carrito) {
        const productoId = Number(item.producto_id);
        const cantidad = Number(item.cantidad);

        if (!Number.isInteger(productoId) || !Number.isFinite(cantidad) || cantidad <= 0) {
          continue;
        }

        const productoResult = await db.exec(`SELECT nombre, precio_unitario, stock_actual FROM productos WHERE id = ${productoId}`);
        const productoRow = productoResult.length > 0 && productoResult[0].values.length > 0
          ? productoResult[0].values[0]
          : null;

        if (!productoRow) continue;
        if (cantidad > Number(productoRow[2])) {
          return res.status(400).json({
            error: `Stock insuficiente para ${productoRow[0]}. Disponible: ${productoRow[2]}`
          });
        }

        const precioUnitario = productoRow[1];
        const itemSubtotal = cantidad * precioUnitario;
        subtotal += itemSubtotal;
        
        validItems.push({
          producto_id: productoId,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal: itemSubtotal
        });
      }

      if (validItems.length === 0) {
        return res.status(400).json({ error: 'No hay productos validos en el pedido' });
      }

      const configResult = await db.exec(`SELECT valor FROM configuracion WHERE clave = 'IVA_PORCENTAJE'`);
      const ivaPorcentaje = configResult.length > 0 ? parseFloat(configResult[0].values[0][0]) : 16;
      const descuento_porcentaje = 0; // Pedidos web sin descuento base por ahora
      const descuentoMonto = 0;
      const subtotalConDescuento = subtotal;
      const iva = subtotalConDescuento * (ivaPorcentaje / 100);
      const total = subtotalConDescuento + iva;

      const validez_dias = 3; // Pedidos web caducan rápido
      const fechaValidez = new Date();
      fechaValidez.setDate(fechaValidez.getDate() + validez_dias);

      const notas = 'Pedido generado automáticamente desde el Catálogo Web.';

      // Insertar orden (cotización)
      await db.run(`INSERT INTO cotizaciones 
        (numero, cliente_id, usuario_id, subtotal, iva, descuento_porcentaje, 
         descuento_monto, total, notas, validez_dias, fecha_validez, estado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
        [numero, cliente_id, usuario_id, subtotal, iva, descuento_porcentaje,
         descuentoMonto, total, notas, validez_dias,
         fechaValidez.toISOString().split('T')[0]]);
      saveDb();

      // Recuperar ID de manera segura basada en el numero que es UNIQUE
      const ordenResult = await db.exec(`SELECT id FROM cotizaciones WHERE numero = '${numero}'`);
      const ordenRow = ordenResult[0].values[0];
      const cotizacionId = ordenRow[0];

      // Insertar items
      for (const item of validItems) {
        await db.run(`INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
          [cotizacionId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]);
      }
      saveDb();

      const notifyResult = await db.exec(`SELECT valor FROM configuracion WHERE clave = 'SUPERMERCADO_EMAIL'`);
      const correoDestino = notifyResult.length > 0 ? notifyResult[0].values[0][0] : null;
      enviarNotificacionPedidoWeb({
        to: correoDestino,
        numero,
        nombre,
        email,
        telefono,
        total
      }).catch(error => {
        console.error('No se pudo enviar notificacion de pedido web:', error.message);
      });

      res.status(201).json({ id: cotizacionId, numero, message: 'Pedido recibido exitosamente' });
    } catch (error) {
      console.error('Error public solicitarPedido:', error);
      res.status(500).json({ error: 'Error interno del servidor al procesar el pedido web' });
    }
  }
}

module.exports = new PublicController();
