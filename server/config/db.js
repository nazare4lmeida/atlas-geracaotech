const { getPool, query } = require('../db/pool');
const { importCatalogIfEmpty } = require('../services/catalogImport');

// Verifica a conexão com o PostgreSQL (Supabase), confirma que as migrações foram aplicadas
// e importa o catálogo inicial se o banco ainda não tiver cursos.
async function connectDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  getPool();
  const { rows } = await query("select to_regclass('public.courses') as table_name");
  if (!rows[0].table_name) {
    throw new Error('Esquema não encontrado. Execute "npm run db:migrate" antes de iniciar a API.');
  }

  console.log('PostgreSQL conectado');

  const imported = await importCatalogIfEmpty();
  if (imported > 0) {
    console.log(`Catálogo inicial importado: ${imported} curso(s).`);
  }
}

module.exports = connectDatabase;
