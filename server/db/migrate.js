require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('./pool');
const { applyPendingBlockPlans } = require('../services/blockPlans');

// Aplica, em ordem, os arquivos de db/migrations que ainda não foram executados.
// Uso: npm run db:migrate
const migrationsDir = path.join(__dirname, 'migrations');

async function migrate(client = getPool()) {
  await client.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await client.query('select name from schema_migrations');
  const applied = new Set(rows.map((row) => row.name));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const executed = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      executed.push(file);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Falha na migração ${file}: ${error.message}`);
    }
  }

  return executed;
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then(async (executed) => {
      if (executed.length === 0) {
        console.log('Banco já está atualizado.');
      } else {
        console.log(`Migrações aplicadas: ${executed.join(', ')}`);
      }
      const plans = await applyPendingBlockPlans();
      plans.forEach((plan) => {
        console.log(`Plano de blocos aplicado: ${plan.title}${plan.warnings.length ? ` (${plan.warnings.join('; ')})` : ''}`);
      });
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
