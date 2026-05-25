const { initDb, saveDb } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { audit } = require('../utils/auditLogger');

async function getSingleRow(db, query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);
  const row = await stmt.step() ? stmt.get() : null;
  stmt.free();
  return row;
}

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contrasena son requeridos' });
      }

      const db = await initDb();
      const userRow = await getSingleRow(
        db,
        'SELECT id, nombre, email, password, rol FROM usuarios WHERE email = ?',
        [email]
      );

      if (!userRow) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }

      const usuario = {
        id: userRow[0],
        nombre: userRow[1],
        email: userRow[2],
        password: userRow[3],
        rol: userRow[4]
      };

      const passwordValido = bcrypt.compareSync(password, usuario.password);
      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
      }

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET || 'dev-secret-change-me',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async registrar(req, res) {
    try {
      const { nombre, email, password, rol } = req.body;
      if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contrasena son requeridos' });
      }
      const rolesValidos = ['admin', 'vendedor'];
      const rolNormalizado = rolesValidos.includes(rol) ? rol : 'vendedor';

      const db = await initDb();
      const existing = await getSingleRow(db, 'SELECT id FROM usuarios WHERE email = ?', [email]);
      if (existing) {
        return res.status(409).json({ error: 'El email ya esta registrado' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.run(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [nombre, email, hashedPassword, rolNormalizado]
      );
      saveDb();

      const result = await db.exec('SELECT last_insert_rowid()');
      const id = result[0].values[0][0];
      await audit(req, {
        accion: 'crear',
        entidad: 'usuario',
        entidad_id: id,
        detalle: { email, rol: rolNormalizado }
      });

      res.status(201).json({ id, nombre, email, rol: rolNormalizado });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getPerfil(req, res) {
    try {
      const db = await initDb();
      const row = await getSingleRow(
        db,
        'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?',
        [req.usuario.id]
      );

      if (!row) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        id: row[0],
        nombre: row[1],
        email: row[2],
        rol: row[3],
        creado_en: row[4]
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new AuthController();
