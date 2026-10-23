const { query } = require('./pool');

async function findActiveClientByKeyHash(keyHash) {
  const { rows } = await query(
    'select id, nome from integracao_clientes where chave_hash = $1 and ativo = true',
    [keyHash]
  );
  return rows[0] || null;
}

async function touchClient(clientId) {
  await query('update integracao_clientes set ultimo_uso = now() where id = $1', [clientId]);
}

async function recordEvent({ clientId, tipo, referencia = '', sucesso, mensagem = '' }) {
  await query(
    `insert into integracao_eventos (cliente_id, tipo, referencia, sucesso, mensagem)
     values ($1, $2, $3, $4, $5)`,
    [clientId || null, tipo, String(referencia).slice(0, 120), sucesso, String(mensagem).slice(0, 500)]
  );
}

async function createClient({ nome, keyHash }) {
  const { rows } = await query(
    'insert into integracao_clientes (nome, chave_hash) values ($1, $2) returning id, nome, created_at',
    [nome, keyHash]
  );
  return rows[0];
}

module.exports = { findActiveClientByKeyHash, touchClient, recordEvent, createClient };
