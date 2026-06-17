const { initDb, saveDb } = require('../config/database');
const { audit } = require('../utils/auditLogger');

class CategoriaController {
  async getAll(req, res) {
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

  async getById(req, res) {
    try {
      const db = await initDb();
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de categoria invalido' });
      }
      const result = await db.query(`SELECT id, nombre, descripcion FROM categorias WHERE id = ?`, [id]);

      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      const row = result[0].values[0];
      res.json({ id: row[0], nombre: row[1], descripcion: row[2] });
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async create(req, res) {
    try {
      const { nombre, descripcion } = req.body;
      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      const db = await initDb();
      await db.run(`INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)`, [nombre, descripcion || null]);
      saveDb();

      const result = await db.exec(`SELECT last_insert_rowid()`);
      const id = result[0].values[0][0];
      await audit(req, {
        accion: 'crear',
        entidad: 'categoria',
        entidad_id: id,
        detalle: { nombre }
      });

      res.status(201).json({ id, nombre, descripcion });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async update(req, res) {
    try {
      const { nombre, descripcion } = req.body;
      const db = await initDb();
      
      await db.run(`UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?`,
        [nombre, descripcion || null, req.params.id]);
      saveDb();
      await audit(req, {
        accion: 'actualizar',
        entidad: 'categoria',
        entidad_id: Number(req.params.id),
        detalle: { nombre }
      });

      res.json({ id: parseInt(req.params.id), nombre, descripcion });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async delete(req, res) {
    try {
      const db = await initDb();
      
      // Antes de borrar, desasociar productos
      await db.run(`UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?`, [req.params.id]);
      
      await db.run(`DELETE FROM categorias WHERE id = ?`, [req.params.id]);
      saveDb();
      await audit(req, {
        accion: 'eliminar',
        entidad: 'categoria',
        entidad_id: Number(req.params.id)
      });
      res.json({ message: 'Categoría eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new CategoriaController();
