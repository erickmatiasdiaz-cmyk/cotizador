const { initDb, saveDb } = require('../config/database');

class ClienteController {
  async getAll(req, res) {
    try {
      const { search, tipo } = req.query;
      const db = await initDb();
      
      let query = `SELECT id, nombre, empresa, rfc, email, telefono, direccion, tipo, creado_en FROM clientes WHERE 1=1`;
      const params = [];

      if (search) {
        const like = `%${search}%`;
        query += ` AND (nombre LIKE ? OR empresa LIKE ? OR email LIKE ? OR rfc LIKE ?)`;
        params.push(like, like, like, like);
      }
      if (tipo) {
        query += ` AND tipo = ?`;
        params.push(tipo);
      }
      query += ` ORDER BY nombre ASC`;

      const result = await db.query(query, params);
      const clientes = result.length > 0 ? result[0].values.map(row => ({
        id: row[0], nombre: row[1], empresa: row[2], rfc: row[3],
        email: row[4], telefono: row[5], direccion: row[6],
        tipo: row[7], creado_en: row[8]
      })) : [];

      res.json(clientes);
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getById(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de cliente invalido' });
      }
      const result = await db.query(`SELECT id, nombre, empresa, rfc, email, telefono, direccion, tipo, creado_en FROM clientes WHERE id = ?`, [id]);

      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const row = result[0].values[0];
      res.json({
        id: row[0], nombre: row[1], empresa: row[2], rfc: row[3],
        email: row[4], telefono: row[5], direccion: row[6],
        tipo: row[7], creado_en: row[8]
      });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async create(req, res) {
    try {
      const { nombre, empresa, rfc, email, telefono, direccion, tipo } = req.body;
      if (!nombre) {
        return res.status(400).json({ error: 'El nombre del cliente es requerido' });
      }

      const db = await initDb();
      const insertResult = await db.query(
        `INSERT INTO clientes (nombre, empresa, rfc, email, telefono, direccion, tipo)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [nombre, empresa || null, rfc || null, email || null, telefono || null, direccion || null, tipo || 'natural']
      );
      saveDb();

      const id = insertResult.length > 0 && insertResult[0].values.length > 0
        ? insertResult[0].values[0][0]
        : (await db.query(`SELECT last_insert_rowid()`))[0].values[0][0];

      res.status(201).json({ id, nombre, empresa, rfc, email, telefono, direccion, tipo: tipo || 'natural' });
    } catch (error) {
      console.error('Error al crear cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async update(req, res) {
    try {
      const { nombre, empresa, rfc, email, telefono, direccion, tipo } = req.body;
      const db = await initDb();
      
      await db.run(`UPDATE clientes SET nombre = ?, empresa = ?, rfc = ?, email = ?, telefono = ?, direccion = ?, tipo = ? WHERE id = ?`,
        [nombre, empresa || null, rfc || null, email || null, telefono || null, direccion || null, tipo || 'natural', req.params.id]);
      saveDb();

      res.json({ id: parseInt(req.params.id), nombre, empresa, rfc, email, telefono, direccion, tipo });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req, res) {
    try {
      const db = await initDb();
      await db.run(`DELETE FROM clientes WHERE id = ?`, [req.params.id]);
      saveDb();
      res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new ClienteController();
