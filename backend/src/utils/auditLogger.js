const { initDb, saveDb } = require('../config/database');

async function audit(req, event) {
  try {
    const db = await initDb();
    const detail = event.detalle ? JSON.stringify(event.detalle) : null;

    await db.run(
      `INSERT INTO auditoria (usuario_id, usuario_email, accion, entidad, entidad_id, detalle)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.usuario?.id || null,
        req.usuario?.email || null,
        event.accion,
        event.entidad,
        event.entidad_id || null,
        detail
      ]
    );
    saveDb();
  } catch (error) {
    console.error('Error al registrar auditoria:', error.message);
  }
}

module.exports = { audit };
