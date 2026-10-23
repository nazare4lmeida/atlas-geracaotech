const { Pool } = require('pg');

// Conexão com o PostgreSQL do Supabase (ou local).
// DATABASE_URL: string de conexão (Supabase: Project Settings > Database).
// DATABASE_SSL: "false" desliga SSL (apenas para Postgres local); padrão: SSL ligado.
let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });

  pool.on('error', (error) => {
    console.error('Erro inesperado na conexão com o banco:', error.message);
  });

  return pool;
}

function query(text, params = []) {
  return getPool().query(text, params);
}

// Executa várias operações em uma transação. Qualquer erro desfaz tudo.
async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, withTransaction, closePool };
