const { initDb, saveDb } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const db = await initDb();
      const result = db.exec(`SELECT id, nombre, email, password, rol FROM usuarios WHERE email = '${email}'`);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const userRow = result[0].values[0];
      const usuario = {
        id: userRow[0],
        nombre: userRow[1],
        email: userRow[2],
        password: userRow[3],
        rol: userRow[4]
      };

      const passwordValido = bcrypt.compareSync(password, usuario.password);
      if (!passwordValido) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET,
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
        return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
      }

      const db = await initDb();
      const existing = db.exec(`SELECT id FROM usuarios WHERE email = '${email}'`);
      if (existing.length > 0 && existing[0].values.length > 0) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      db.run(`INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)`,
        [nombre, email, hashedPassword, rol || 'vendedor']);
      saveDb();

      const result = db.exec(`SELECT last_insert_rowid()`);
      const id = result[0].values[0][0];

      res.status(201).json({ id, nombre, email, rol: rol || 'vendedor' });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getPerfil(req, res) {
    try {
      const db = await initDb();
      const result = db.exec(`SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ${req.usuario.id}`);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const row = result[0].values[0];
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
