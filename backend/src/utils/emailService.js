const nodemailer = require('nodemailer');
const { initDb } = require('../config/database');

function getTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Configura EMAIL_HOST, EMAIL_PORT, EMAIL_USER y EMAIL_PASS para enviar correos');
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

async function getConfig() {
  const db = await initDb();
  const config = {};
  const result = await db.exec('SELECT clave, valor FROM configuracion');

  if (result.length > 0) {
    result[0].values.forEach(row => {
      config[row[0]] = row[1];
    });
  }

  return config;
}

async function enviarCotizacionEmail(emailCliente, pdfData, numeroCotizacion) {
  if (!emailCliente) {
    throw new Error('El cliente no tiene email registrado');
  }

  const config = await getConfig();
  const transporter = getTransporter();
  const nombreNegocio = config.SUPERMERCADO_NOMBRE || 'Comercial Pro';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: emailCliente,
    subject: `Cotizacion ${numeroCotizacion} - ${nombreNegocio}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #065f46;">Cotizacion enviada</h2>
        <p>Hola, adjuntamos la cotizacion <strong>${numeroCotizacion}</strong>.</p>
        <p>Quedamos atentos para confirmar disponibilidad, entrega y condiciones finales.</p>
        <p style="margin-top: 24px; color: #64748b;">${nombreNegocio}</p>
      </div>
    `,
    attachments: [
      {
        filename: `${numeroCotizacion}.pdf`,
        content: pdfData,
        contentType: 'application/pdf'
      }
    ]
  });

  return { success: true, message: 'Email enviado correctamente' };
}

async function enviarNotificacionPedidoWeb({ to, numero, nombre, email, telefono, total }) {
  if (!to) {
    throw new Error('No hay correo de destino configurado para notificar pedidos web');
  }

  const config = await getConfig();
  const transporter = getTransporter();
  const nombreNegocio = config.SUPERMERCADO_NOMBRE || 'Comercial Pro';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Nuevo pedido web ${numero} - ${nombreNegocio}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #065f46;">Nuevo pedido desde el catalogo web</h2>
        <p><strong>Pedido:</strong> ${numero}</p>
        <p><strong>Cliente:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefono:</strong> ${telefono || 'No informado'}</p>
        <p><strong>Total estimado:</strong> ${Number(total || 0).toLocaleString('es-CL')}</p>
        <p style="margin-top: 24px; color: #64748b;">Revisa el panel para confirmar stock, pago y despacho.</p>
      </div>
    `
  });

  return { success: true, message: 'Notificacion enviada correctamente' };
}

module.exports = { enviarCotizacionEmail, enviarNotificacionPedidoWeb };
