const { query } = require('./pool');

// Grava so o registro de uso (sem conteudo da conversa).
async function registrarUso({ usuarioId, modulo, provedor, modelo, status, tokensEntrada, tokensSaida, codigoErro }) {
  await query(
    `insert into ia_usos (usuario_id, modulo, provedor, modelo, status, tokens_entrada, tokens_saida, codigo_erro)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      usuarioId ? String(usuarioId) : null,
      String(modulo || '').slice(0, 60),
      String(provedor || 'desconhecido').slice(0, 30),
      String(modelo || 'desconhecido').slice(0, 120),
      status,
      tokensEntrada ?? null,
      tokensSaida ?? null,
      codigoErro || null,
    ]
  );
}

// Liga/desliga pelo painel. Sem linha no banco, a IA fica desligada.
async function lerLigada() {
  const { rows } = await query("select valor from ia_configuracao where chave = 'ligada'");
  return rows[0]?.valor === 'true';
}

async function salvarLigada(ligada, usuarioId) {
  await query(
    `insert into ia_configuracao (chave, valor, atualizado_em, atualizado_por)
     values ('ligada', $1, now(), $2)
     on conflict (chave) do update
       set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por`,
    [ligada ? 'true' : 'false', usuarioId ? String(usuarioId) : null]
  );
}

module.exports = { registrarUso, lerLigada, salvarLigada };
