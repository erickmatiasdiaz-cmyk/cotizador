const { initDb, saveDb } = require('../config/database');
const { audit } = require('../utils/auditLogger');

class ConfiguracionController {
  async getAll(req, res) {
    try {
      const db = await initDb();
      const configResult = await db.exec(`SELECT clave, valor FROM configuracion`);
      const config = {};
      
      if (configResult.length > 0) {
        configResult[0].values.forEach(row => {
          config[row[0]] = row[1];
        });
      }
      res.json(config);
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async update(req, res) {
    try {
      const db = await initDb();
      const data = req.body;
      
      const clavesPermitidas = new Set([
        'SUPERMERCADO_NOMBRE',
        'SUPERMERCADO_DIRECCION',
        'SUPERMERCADO_TELEFONO',
        'SUPERMERCADO_EMAIL',
        'SUPERMERCADO_LOGO',
        'IVA_PORCENTAJE',
        'MONEDA'
      ]);

      for (const [clave, valor] of Object.entries(data)) {
        if (valor === undefined || valor === null) continue;
        if (!clavesPermitidas.has(clave)) continue;
        
        // Verificamos si existe la clave en la tabla
        const existe = await db.query(`SELECT id FROM configuracion WHERE clave = ?`, [clave]);
        const existeClave = existe.length > 0 && existe[0].values.length > 0;

        if (existeClave) {
          await db.run(`UPDATE configuracion SET valor = ? WHERE clave = ?`, [valor, clave]);
        } else {
          await db.run(`INSERT INTO configuracion (clave, valor) VALUES (?, ?)`, [clave, valor]);
        }
      }
      saveDb();
      await audit(req, {
        accion: 'actualizar',
        entidad: 'configuracion',
        detalle: { claves: Object.keys(data) }
      });

      res.json({ message: 'Configuración actualizada exitosamente' });
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = new ConfiguracionController();
