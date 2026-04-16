const PDFDocument = require('pdfkit');
const { initDb } = require('../config/database');

async function generarPDFCotizacion(cotizacionId, res) {
  const db = await initDb();
  
  const query = `
    SELECT 
      c.id, c.numero, c.cliente_id, cl.nombre as cliente_nombre, 
      cl.empresa as cliente_empresa, cl.rfc as cliente_rfc,
      cl.email as cliente_email, cl.telefono as cliente_telefono,
      cl.direccion as cliente_direccion,
      c.usuario_id, u.nombre as usuario_nombre,
      c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
      c.notas, c.validez_dias, c.fecha_validez, c.estado,
      c.creado_en
    FROM cotizaciones c
    INNER JOIN clientes cl ON c.cliente_id = cl.id
    INNER JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.id = ${cotizacionId}
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
    usuario_id: row[9], usuario_nombre: row[10],
    subtotal: row[11], iva: row[12],
    descuento_porcentaje: row[13], descuento_monto: row[14], total: row[15],
    notas: row[16], validez_dias: row[17], fecha_validez: row[18],
    estado: row[19], creado_en: row[20]
  };

  const itemsResult = db.exec(`
    SELECT ci.id, ci.producto_id, p.nombre as producto_nombre,
           p.descripcion as producto_descripcion,
           ci.cantidad, ci.precio_unitario, ci.subtotal
    FROM cotizacion_items ci
    INNER JOIN productos p ON ci.producto_id = p.id
    WHERE ci.cotizacion_id = ${cotizacionId}
    ORDER BY ci.id ASC
  `);

  const items = itemsResult.length > 0 ? itemsResult[0].values.map(row => ({
    id: row[0], producto_id: row[1], producto_nombre: row[2],
    producto_descripcion: row[3], cantidad: row[4],
    precio_unitario: row[5], subtotal: row[6]
  })) : [];

  const config = {};
  const configResult = db.exec(`SELECT clave, valor FROM configuracion`);
  if (configResult.length > 0) {
    configResult[0].values.forEach(row => {
      config[row[0]] = row[1];
    });
  }

  try {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
    
    if (res) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cotizacion.numero}.pdf"`);
      doc.pipe(res);
    }

    const colorPrimario = '#1e40af';
    const colorSecundario = '#64748b';

    let textX = 50;
    let initialY = 50;

    if (config.SUPERMERCADO_LOGO) {
      try {
        const base64Data = config.SUPERMERCADO_LOGO.replace(/^data:image\/\w+;base64,/, "");
        const logoBuffer = Buffer.from(base64Data, 'base64');
        doc.image(logoBuffer, 50, 50, { fit: [120, 60] });
        textX = 180;
      } catch (e) {
        console.error('Error cargando el logo', e);
      }
    }

    // HEADER - Empresa
    doc.fillColor(colorPrimario);
    doc.fontSize(22).text(config.SUPERMERCADO_NOMBRE || 'Mi Supermercado', textX, initialY, { align: 'left', width: 300 });
    
    doc.fillColor(colorSecundario);
    doc.fontSize(9);
    doc.text(config.SUPERMERCADO_DIRECCION || '', textX, doc.y, { align: 'left', width: 300 });
    doc.text(`Tel: ${config.SUPERMERCADO_TELEFONO || ''}`, textX, doc.y, { align: 'left', width: 300 });
    doc.text(config.SUPERMERCADO_EMAIL || '', textX, doc.y, { align: 'left', width: 300 });

    doc.x = 50;
    doc.y = Math.max(doc.y, 120);

    // Cotización info (lado derecho)
    doc.fillColor(colorPrimario);
    doc.fontSize(16).text('COTIZACION', { align: 'right' });
    
    doc.fillColor('#000');
    doc.fontSize(11);
    doc.text(`No. ${cotizacion.numero}`, { align: 'right' });
    
    const fechaCreacion = new Date(cotizacion.creado_en);
    doc.text(`Fecha: ${fechaCreacion.toLocaleDateString('es-MX')}`, { align: 'right' });
    doc.text(`Vigencia: ${cotizacion.fecha_validez}`, { align: 'right' });
    
    const estadoColor = cotizacion.estado === 'aceptada' ? '#16a34a' : cotizacion.estado === 'rechazada' ? '#dc2626' : '#d97706';
    doc.fillColor(estadoColor);
    doc.fontSize(12).text(cotizacion.estado.toUpperCase(), { align: 'right' });

    doc.moveDown(2);

    // LINEA SEPARADORA
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor(colorPrimario).lineWidth(2).stroke();
    doc.moveDown(1);

    // INFORMACION DEL CLIENTE
    doc.fillColor(colorPrimario);
    doc.fontSize(11).text('DATOS DEL CLIENTE');
    
    doc.fillColor('#000');
    doc.fontSize(9);
    doc.text(`Nombre: ${cotizacion.cliente_nombre}`);
    if (cotizacion.cliente_empresa) doc.text(`Empresa: ${cotizacion.cliente_empresa}`);
    if (cotizacion.cliente_rfc) doc.text(`RFC: ${cotizacion.cliente_rfc}`);
    if (cotizacion.cliente_direccion) doc.text(`Direccion: ${cotizacion.cliente_direccion}`);
    if (cotizacion.cliente_email) doc.text(`Email: ${cotizacion.cliente_email}`);
    if (cotizacion.cliente_telefono) doc.text(`Telefono: ${cotizacion.cliente_telefono}`);

    doc.moveDown(1);

    // TABLA DE PRODUCTOS
    doc.fillColor(colorPrimario);
    doc.fontSize(11).text('PRODUCTOS');
    doc.moveDown(0.3);

    // Encabezados de tabla
    const tableTop = doc.y;
    const tableHeight = 18;
    const startX = 50;
    const colWidths = [60, 250, 70, 80, 100];
    let currentX = startX;
    
    // Dibujar encabezados
    doc.fillColor('#ffffff');
    doc.fontSize(9);
    
    const headers = ['Cantidad', 'Producto', 'P. Unitario', 'Subtotal', 'Total'];
    colWidths.forEach((width, i) => {
      doc.rect(currentX, tableTop, width, tableHeight).fill();
      doc.fillColor('#ffffff');
      doc.text(headers[i], currentX + 5, tableTop + 4, { width: width - 10 });
      currentX += width;
    });

    // Filas de productos
    let currentY = tableTop + tableHeight;
    const rowHeight = 18;
    
    items.forEach((item, index) => {
      currentX = startX;
      const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
      
      // Fondo de fila
      doc.fillColor(bgColor);
      colWidths.forEach(width => {
        doc.rect(currentX, currentY, width, rowHeight).fill();
        currentX += width;
      });

      // Contenido
      doc.fillColor('#000');
      doc.fontSize(8);
      currentX = startX;
      
      doc.text(item.cantidad.toString(), currentX + 5, currentY + 4, { width: colWidths[0] - 10 });
      currentX += colWidths[0];
      
      doc.text(item.producto_nombre, currentX + 5, currentY + 4, { width: colWidths[1] - 10, ellipsis: true });
      currentX += colWidths[1];
      
      doc.text(`$${item.precio_unitario.toFixed(2)}`, currentX + 5, currentY + 4, { width: colWidths[2] - 10, align: 'right' });
      currentX += colWidths[2];
      
      doc.text(`$${item.subtotal.toFixed(2)}`, currentX + 5, currentY + 4, { width: colWidths[3] - 10, align: 'right' });
      currentX += colWidths[3];
      
      doc.text(`$${item.subtotal.toFixed(2)}`, currentX + 5, currentY + 4, { width: colWidths[4] - 10, align: 'right' });

      currentY += rowHeight;

      // Nueva página si es necesario
      if (currentY > 680) {
        doc.addPage();
        currentY = 50;
      }
    });

    // Borde de tabla
    doc.strokeColor('#e2e8f0').lineWidth(1);
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    doc.rect(startX, tableTop, totalWidth, currentY - tableTop).stroke();

    doc.moveDown(1);

    // TOTALES
    const totalsX = 380;
    let totalsY = currentY + 15;

    doc.fillColor('#000');
    doc.fontSize(9);
    doc.text('Subtotal:', totalsX, totalsY, { width: 80, align: 'right' });
    doc.text(`$${cotizacion.subtotal.toFixed(2)}`, totalsX + 85, totalsY);
    totalsY += 18;

    if (cotizacion.descuento_porcentaje > 0) {
      doc.text(`Descuento (${cotizacion.descuento_porcentaje}%):`, totalsX, totalsY, { width: 80, align: 'right' });
      doc.text(`-$${cotizacion.descuento_monto.toFixed(2)}`, totalsX + 85, totalsY);
      totalsY += 18;
    }

    const ivaPorcentaje = config.IVA_PORCENTAJE || '16';
    doc.text(`IVA (${ivaPorcentaje}%):`, totalsX, totalsY, { width: 80, align: 'right' });
    doc.text(`$${cotizacion.iva.toFixed(2)}`, totalsX + 85, totalsY);
    totalsY += 22;

    // Total
    doc.fillColor(colorPrimario);
    doc.fontSize(13);
    doc.text('TOTAL:', totalsX, totalsY, { width: 80, align: 'right' });
    doc.text(`$${cotizacion.total.toFixed(2)} ${config.MONEDA || 'MXN'}`, totalsX + 85, totalsY);

    doc.moveDown(2);

    // NOTAS
    if (cotizacion.notas) {
      doc.fillColor(colorPrimario);
      doc.fontSize(11).text('NOTAS:');
      doc.fillColor('#000');
      doc.fontSize(9);
      doc.text(cotizacion.notas, { width: 510 });
    }

    doc.moveDown(2);

    // FOOTER
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor(colorPrimario).lineWidth(1).stroke();
    doc.moveDown(0.3);
    
    doc.fillColor(colorSecundario);
    doc.fontSize(8);
    doc.text('Gracias por su preferencia', { align: 'center' });
    doc.text(config.SUPERMERCADO_NOMBRE || 'Mi Supermercado', { align: 'center' });
    doc.text('Esta cotizacion es valida por el periodo indicado. Precios sujetos a cambio sin previo aviso.', { align: 'center' });

    if (!res) return doc; // Devuelve el doc si no hay res

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF: ' + error.message });
  }
}

async function generarPDFFactura(cotizacionId, res) {
  const db = await initDb();
  
  const query = `
    SELECT 
      c.id, c.numero, c.cliente_id, cl.nombre as cliente_nombre, 
      cl.empresa as cliente_empresa, cl.rfc as cliente_rfc,
      cl.email as cliente_email, cl.telefono as cliente_telefono,
      cl.direccion as cliente_direccion,
      c.usuario_id, u.nombre as usuario_nombre,
      c.subtotal, c.iva, c.descuento_porcentaje, c.descuento_monto, c.total,
      c.notas, c.validez_dias, c.fecha_validez, c.estado,
      c.creado_en, c.factura_numero, c.factura_fecha
    FROM cotizaciones c
    INNER JOIN clientes cl ON c.cliente_id = cl.id
    INNER JOIN usuarios u ON c.usuario_id = u.id
    WHERE c.id = ${cotizacionId}
  `;
  
  const result = db.exec(query);
  if (result.length === 0 || result[0].values.length === 0) {
    if(res) return res.status(404).json({ error: 'Cotización no encontrada' });
    throw new Error('Cotizacion no encontrada');
  }

  const row = result[0].values[0];
  const cotizacion = {
    id: row[0], numero: row[1], cliente_id: row[2], cliente_nombre: row[3],
    cliente_empresa: row[4], cliente_rfc: row[5], cliente_email: row[6],
    cliente_telefono: row[7], cliente_direccion: row[8],
    usuario_id: row[9], usuario_nombre: row[10],
    subtotal: row[11], iva: row[12],
    descuento_porcentaje: row[13], descuento_monto: row[14], total: row[15],
    notas: row[16], validez_dias: row[17], fecha_validez: row[18],
    estado: row[19], creado_en: row[20], factura_numero: row[21], factura_fecha: row[22]
  };

  const itemsResult = db.exec(`
    SELECT ci.id, ci.producto_id, p.nombre as producto_nombre,
           ci.cantidad, ci.precio_unitario, ci.subtotal
    FROM cotizacion_items ci
    INNER JOIN productos p ON ci.producto_id = p.id
    WHERE ci.cotizacion_id = ${cotizacionId}
    ORDER BY ci.id ASC
  `);

  const items = itemsResult.length > 0 ? itemsResult[0].values.map(row => ({
    cantidad: row[3], producto_nombre: row[2],
    precio_unitario: row[4], subtotal: row[5]
  })) : [];

  const config = {};
  const configResult = db.exec(`SELECT clave, valor FROM configuracion`);
  if (configResult.length > 0) configResult[0].values.forEach(row => { config[row[0]] = row[1]; });

  try {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
    if (res) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cotizacion.factura_numero || cotizacion.numero}.pdf"`);
      doc.pipe(res);
    }
    
    const colorPrimario = '#1e40af';
    const colorSecundario = '#64748b';

    let textX = 50;
    let initialY = 50;
    if (config.SUPERMERCADO_LOGO) {
      try {
        const logoBuffer = Buffer.from(config.SUPERMERCADO_LOGO.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        doc.image(logoBuffer, 50, 50, { fit: [120, 60] });
        textX = 180;
      } catch (e) {}
    }

    doc.fillColor(colorPrimario);
    doc.fontSize(22).text(config.SUPERMERCADO_NOMBRE || 'Mi Supermercado', textX, initialY, { align: 'left', width: 300 });
    doc.fillColor(colorSecundario).fontSize(9);
    doc.text(config.SUPERMERCADO_DIRECCION || '', textX, doc.y, { align: 'left', width: 300 });
    doc.text(`Tel: ${config.SUPERMERCADO_TELEFONO || ''}`, textX, doc.y, { align: 'left', width: 300 });
    doc.text(config.SUPERMERCADO_EMAIL || '', textX, doc.y, { align: 'left', width: 300 });

    doc.x = 50;
    doc.y = Math.max(doc.y, 120);

    doc.fillColor(colorPrimario);
    doc.fontSize(16).text('FACTURA COMERCIAL', { align: 'right' });
    doc.fillColor('#000').fontSize(11);
    doc.text(`Folio No. ${cotizacion.factura_numero || 'PENDIENTE'}`, { align: 'right' });
    const fechaFactura = cotizacion.factura_fecha ? new Date(cotizacion.factura_fecha) : new Date(cotizacion.creado_en);
    doc.text(`Emision: ${fechaFactura.toLocaleDateString('es-MX')}`, { align: 'right' });
    
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor(colorPrimario).lineWidth(2).stroke();
    doc.moveDown(1);
    
    doc.fillColor(colorPrimario).fontSize(11).text('DATOS DEL CLIENTE');
    doc.fillColor('#000').fontSize(9);
    doc.text(`Nombre: ${cotizacion.cliente_nombre}`);
    if (cotizacion.cliente_empresa) doc.text(`Empresa: ${cotizacion.cliente_empresa}`);
    if (cotizacion.cliente_rfc) doc.text(`RFC: ${cotizacion.cliente_rfc}`);
    if (cotizacion.cliente_direccion) doc.text(`Direccion: ${cotizacion.cliente_direccion}`);
    
    doc.moveDown(1);
    doc.fillColor(colorPrimario).fontSize(11).text('PRODUCTOS').moveDown(0.3);

    const tableTop = doc.y;
    const startX = 50;
    const colWidths = [60, 250, 70, 80, 100];
    let currentX = startX;
    
    doc.fillColor('#ffffff').fontSize(9);
    const headers = ['Cantidad', 'Producto', 'P. Unitario', 'Subtotal', 'Total'];
    colWidths.forEach((width, i) => {
      doc.rect(currentX, tableTop, width, 18).fill();
      doc.fillColor('#ffffff').text(headers[i], currentX + 5, tableTop + 4, { width: width - 10 });
      currentX += width;
    });

    let currentY = tableTop + 18;
    items.forEach((item, index) => {
      currentX = startX;
      doc.fillColor(index % 2 === 0 ? '#f8fafc' : '#ffffff');
      colWidths.forEach(width => { doc.rect(currentX, currentY, width, 18).fill(); currentX += width; });
      doc.fillColor('#000').fontSize(8);
      currentX = startX;
      
      doc.text(item.cantidad.toString(), currentX + 5, currentY + 4, { width: colWidths[0] - 10 }); currentX += colWidths[0];
      doc.text(item.producto_nombre, currentX + 5, currentY + 4, { width: colWidths[1] - 10, ellipsis: true }); currentX += colWidths[1];
      doc.text(`$${item.precio_unitario.toFixed(2)}`, currentX + 5, currentY + 4, { width: colWidths[2] - 10, align: 'right' }); currentX += colWidths[2];
      doc.text(`$${item.subtotal.toFixed(2)}`, currentX + 5, currentY + 4, { width: colWidths[3] - 10, align: 'right' }); currentX += colWidths[3];
      doc.text(`$${item.subtotal.toFixed(2)}`, currentX + 5, currentY + 4, { width: colWidths[4] - 10, align: 'right' });
      currentY += 18;
      if (currentY > 680) { doc.addPage(); currentY = 50; }
    });

    doc.strokeColor('#e2e8f0').lineWidth(1);
    doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), currentY - tableTop).stroke();
    doc.moveDown(1);

    const totalsX = 380;
    let totalsY = currentY + 15;
    doc.fillColor('#000').fontSize(9);
    doc.text('Subtotal:', totalsX, totalsY, { width: 80, align: 'right' }).text(`$${cotizacion.subtotal.toFixed(2)}`, totalsX + 85, totalsY);
    totalsY += 18;
    if (cotizacion.descuento_porcentaje > 0) {
      doc.text(`Descuento (${cotizacion.descuento_porcentaje}%):`, totalsX, totalsY, { width: 80, align: 'right' }).text(`-$${cotizacion.descuento_monto.toFixed(2)}`, totalsX + 85, totalsY);
      totalsY += 18;
    }
    doc.text(`IVA (${config.IVA_PORCENTAJE || '16'}%):`, totalsX, totalsY, { width: 80, align: 'right' }).text(`$${cotizacion.iva.toFixed(2)}`, totalsX + 85, totalsY);
    totalsY += 22;
    doc.fillColor(colorPrimario).fontSize(13);
    doc.text('TOTAL DE VENTA:', totalsX, totalsY, { width: 80, align: 'right' }).text(`$${cotizacion.total.toFixed(2)} ${config.MONEDA || 'MXN'}`, totalsX + 85, totalsY);

    if (cotizacion.notas) {
      doc.moveDown(2).fillColor(colorPrimario).fontSize(11).text('NOTAS IMPORTANTES:').fillColor('#000').fontSize(9).text(cotizacion.notas, { width: 510 });
    }

    doc.moveTo(50, doc.y + 30).lineTo(562, doc.y + 30).strokeColor(colorPrimario).lineWidth(1).stroke();
    doc.fillColor(colorSecundario).fontSize(8);
    doc.text('¡Gracias por su preferencia!', 50, doc.y + 40, { align: 'center' });
    doc.text(config.SUPERMERCADO_NOMBRE || 'Mi Supermercado', { align: 'center' });
    doc.text('Este documento es un comprobante de venta comercial impreso automáticmente.', { align: 'center' });

    if (!res) return doc;
    doc.end();
  } catch (error) {
    if (res) res.status(500).json({ error: error.message });
  }
}

module.exports = { generarPDFCotizacion, generarPDFFactura };
