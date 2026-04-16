const nodemailer = require('nodemailer');
const { initDb, saveDb } = require('../config/database');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarCotizacionEmail(cotizacionId) {
  const db = await initDb();
  
  const result = db.exec(`
    SELECT c.id, c.numero, c.cliente_id, cl.nombre as cliente_nombre, 
           cl.email as cliente_email, c.total, c.fecha_validez, c.estado
    FROM cotizaciones c
    INNER JOIN clientes cl ON c.cliente_id = cl.id
    WHERE c.id = ${cotizacionId}
  `);

  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Cotización no encontrada');
  }

  const row = result[0].values[0];
  const cotizacion = {
    id: row[0], numero: row[1], cliente_id: row[2], cliente_nombre: row[3],
    cliente_email: row[4], total: row[5], fecha_validez: row[6], estado: row[7]
  };

  if (!cotizacion.cliente_email) {
    throw new Error('El cliente no tiene email registrado');
  }

  const config = {};
  const configResult = db.exec(`SELECT clave, valor FROM configuracion`);
  if (configResult.length > 0) {
    configResult[0].values.forEach(r => { config[r[0]] = r[1]; });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Cotización ${cotizacion.numero}</title></head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr><td align="center" style="padding: 40px 0;">
          <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff;">
            <tr><td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${config.SUPERMERCADO_NOMBRE || 'Mi Supermercado'}</h1>
            </td></tr>
            <tr><td style="padding: 40px;">
              <h2 style="color: #1e40af;">Cotización Enviada</h2>
              <p>Estimado/a <strong>${cotizacion.cliente_nombre}</strong>,</p>
              <p>Adjunto encontrará la cotización solicitada:</p>
              <table style="width: 100%; background-color: #f8fafc; border-radius: 8px;">
                <tr><td style="padding: 20px;">
                  <p><strong>Número:</strong> ${cotizacion.numero}</p>
                  <p><strong>Total:</strong> $${cotizacion.total.toFixed(2)} ${config.MONEDA || 'MXN'}</p>
                  <p><strong>Válida hasta:</strong> ${cotizacion.fecha_validez}</p>
                </td></tr>
              </table>
              <p style="margin-top: 30px;">Si tiene alguna pregunta, no dude en contactarnos.</p>
            </td></tr>
            <tr><td style="background-color: #f8fafc; padding: 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px;">${config.SUPERMERCADO_NOMBRE || 'Mi Supermercado'} | ${config.SUPERMERCADO_TELEFONO || ''}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: cotizacion.cliente_email,
    subject: `Cotización ${cotizacion.numero} - ${config.SUPERMERCADO_NOMBRE || 'Mi Supermercado'}`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    db.run(`UPDATE cotizaciones SET enviado_email = 1 WHERE id = ?`, [cotizacionId]);
    saveDb();
    return { success: true, message: 'Email enviado exitosamente' };
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw new Error('Error al enviar email: ' + error.message);
  }
}

module.exports = { enviarCotizacionEmail };
