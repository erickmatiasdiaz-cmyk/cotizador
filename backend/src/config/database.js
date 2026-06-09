const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let db = null;
let pgPool = null;
let initPromise = null;

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'cotizador.db');

async function initDb() {
  // Si ya hay una instancia, devolverla inmediatamente
  if (db) return db;
  
  // Si ya se está inicializando, esperar a esa misma promesa
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (process.env.DATABASE_URL) {
        pgPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
          max: Number(process.env.DATABASE_POOL_MAX || 10),
          idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000),
          connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS || 10000)
        });
        await pgPool.query('SELECT 1');
        db = createPostgresCompatDb(pgPool);
        console.log('Base de datos Supabase/Postgres conectada');
        return db;
      }

      const SQL = await initSqlJs();
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        decorateSqliteDb(db);
        console.log('📂 Base de datos cargada desde archivo');
      } else {
        db = new SQL.Database();
        decorateSqliteDb(db);
        console.log('🆕 Nueva base de datos creada en memoria');
      }
      return db;
    } catch (error) {
      if (process.env.DATABASE_URL) {
        throw error;
      }
      const SQL = await initSqlJs();
      db = new SQL.Database();
      decorateSqliteDb(db);
      return db;
    } finally {
      initPromise = null; // Limpiar la promesa una vez finalizado
    }
  })();

  return initPromise;
}

function saveDb() {
  if (db && !db.isPostgres) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('❌ Error al guardar base de datos:', error.message);
    }
  }
}

function normalizePostgresQuery(query) {
  return query
    .replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO')
    .replace(/strftime\('%Y',\s*([^)]+)\)\s*=\s*'(\d{4})'/gi, 'EXTRACT(YEAR FROM $1) = $2')
    .replace(/date\('now',\s*'-7 days'\)/gi, "CURRENT_DATE - INTERVAL '7 days'")
    .replace(/\s+COLLATE\s+NOCASE/gi, '')
    .replace(/enviado_email\s*=\s*1/gi, 'enviado_email = true');
}

function toPostgresParams(query) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

function toSqlJsResult(result) {
  if (!result.fields || result.fields.length === 0) return [];
  return [{
    columns: result.fields.map(field => field.name),
    values: result.rows.map(row => result.fields.map(field => row[field.name]))
  }];
}

function querySqlite(sqliteDb, query, params = []) {
  if (!params || params.length === 0) {
    return sqliteDb.exec(query);
  }

  const stmt = sqliteDb.prepare(query);
  const columns = stmt.getColumnNames ? stmt.getColumnNames() : [];
  const values = [];

  try {
    stmt.bind(params);
    while (stmt.step()) {
      values.push(stmt.get());
    }
  } finally {
    stmt.free();
  }

  if (values.length === 0 && columns.length === 0) return [];
  return [{ columns, values }];
}

function decorateSqliteDb(sqliteDb) {
  sqliteDb.isPostgres = false;
  sqliteDb.query = async (query, params = []) => querySqlite(sqliteDb, query, params);
  sqliteDb.transaction = async (callback) => {
    await sqliteDb.run('BEGIN');
    try {
      const result = await callback(sqliteDb);
      await sqliteDb.run('COMMIT');
      saveDb();
      return result;
    } catch (error) {
      await sqliteDb.run('ROLLBACK');
      throw error;
    }
  };
  return sqliteDb;
}

function createPostgresCompatDb(client, pool = client) {
  return {
    isPostgres: true,
    async exec(query) {
      const result = await client.query(normalizePostgresQuery(query));
      return toSqlJsResult(result);
    },
    async query(query, params = []) {
      const sql = toPostgresParams(normalizePostgresQuery(query));
      const result = await client.query(sql, params);
      return toSqlJsResult(result);
    },
    async run(query, params = []) {
      const sql = toPostgresParams(normalizePostgresQuery(query));
      await client.query(sql, params);
    },
    async transaction(callback) {
      if (!pool?.connect) {
        await client.query('BEGIN');
        try {
          const result = await callback(createPostgresCompatDb(client, null));
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }

      const transactionClient = await pool.connect();
      try {
        await transactionClient.query('BEGIN');
        const result = await callback(createPostgresCompatDb(transactionClient, null));
        await transactionClient.query('COMMIT');
        return result;
      } catch (error) {
        await transactionClient.query('ROLLBACK');
        throw error;
      } finally {
        transactionClient.release();
      }
    },
    prepare(query) {
      const sql = toPostgresParams(normalizePostgresQuery(query));
      let boundParams = [];
      let currentRows = [];
      let currentIndex = -1;
      let fields = [];

      return {
        bind(params = []) {
          boundParams = params;
        },
        async run(params = boundParams) {
          await client.query(sql, params);
        },
        async step() {
          if (currentIndex === -1) {
            const result = await client.query(sql, boundParams);
            currentRows = result.rows;
            fields = result.fields.map(field => field.name);
          }
          currentIndex += 1;
          return currentIndex < currentRows.length;
        },
        get() {
          const row = currentRows[currentIndex];
          return fields.map(field => row[field]);
        },
        free() {}
      };
    }
  };
}

module.exports = { initDb, saveDb };
