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

module.exports = { registrarUso };
