const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'cotizador.db');

async function initDb() {
  const SQL = await initSqlJs();
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('📂 Base de datos cargada desde archivo');
    } else {
      db = new SQL.Database();
      console.log('🆕 Nueva base de datos creada en memoria');
    }
  } catch (error) {
    db = new SQL.Database();
  }

  return db;
}

function saveDb() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('❌ Error al guardar base de datos:', error.message);
    }
  }
}

module.exports = { initDb, saveDb };
